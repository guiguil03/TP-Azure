import { app } from '@azure/functions'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

// Phase 4 — Notification email lors d'une assignation
app.http('notify-assigned', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    try {
      const payload = await request.json()
      const record = payload.record
      if (!record?.assigned_to || record.assigned_to === payload.old_record?.assigned_to) {
        return { status: 200, body: JSON.stringify({ skipped: true }), headers: { 'Content-Type': 'application/json' } }
      }
      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
      const { data: userData } = await supabase.auth.admin.getUserById(record.assigned_to)
      const email = userData?.user?.email

      await supabase.from('notifications').insert({
        user_id: record.assigned_to,
        type: 'task_assigned',
        title: `Nouvelle tâche : ${record.title}`,
        body: `Priorité ${record.priority ?? 'normale'}`,
        metadata: { task_id: record.id, project_id: record.project_id }
      })

      if (email) {
        const resend = new Resend(process.env.RESEND_API_KEY)
        await resend.emails.send({
          from: 'TaskFlow <onboarding@resend.dev>',
          to: email,
          subject: `Nouvelle tâche assignée : ${record.title}`,
          html: `<p>Vous avez été assigné à la tâche <strong>${record.title}</strong>.</p>`
        })
      }
      return { status: 200, body: JSON.stringify({ notified: email }), headers: { 'Content-Type': 'application/json' } }
    } catch (e) {
      return { status: 500, body: JSON.stringify({ error: e.message }), headers: { 'Content-Type': 'application/json' } }
    }
  }
})

// Phase 5 — Validation et création d'une tâche avec règles métier
app.http('validate-task', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    try {
      const authHeader = request.headers.get('authorization')
      if (!authHeader) return { status: 401, body: 'Non authentifié' }

      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY,
        { global: { headers: { Authorization: authHeader } } }
      )

      const body = await request.json()
      const { project_id, title, due_date, assigned_to } = body ?? {}
      const errors = []

      if (!title || title.trim().length < 3)
        errors.push('Le titre doit faire au moins 3 caractères')
      if (title?.length > 200)
        errors.push('Le titre ne peut pas dépasser 200 caractères')
      if (due_date && new Date(due_date) < new Date())
        errors.push("La date d'échéance ne peut pas être dans le passé")

      if (assigned_to) {
        const { data: membership } = await supabase
          .from('project_members').select('user_id')
          .eq('project_id', project_id).eq('user_id', assigned_to).maybeSingle()
        if (!membership)
          errors.push("L'utilisateur assigné n'est pas membre du projet")
      }

      if (errors.length > 0) {
        return { status: 400, body: JSON.stringify({ valid: false, errors }), headers: { 'Content-Type': 'application/json' } }
      }

      const { data: { user } } = await supabase.auth.getUser()
      const { data: task, error } = await supabase.from('tasks')
        .insert({ project_id, title: title.trim(), due_date, assigned_to, created_by: user?.id })
        .select().single()

      if (error) return { status: 500, body: JSON.stringify({ error: error.message }), headers: { 'Content-Type': 'application/json' } }
      return { status: 201, body: JSON.stringify({ valid: true, task }), headers: { 'Content-Type': 'application/json' } }
    } catch (e) {
      return { status: 500, body: JSON.stringify({ error: e.message }), headers: { 'Content-Type': 'application/json' } }
    }
  }
})

// Phase 5 — Statistiques agrégées d'un projet
app.http('project-stats', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    try {
      const url = new URL(request.url)
      const projectId = url.searchParams.get('project_id')
      if (!projectId) return { status: 400, body: 'project_id requis' }

      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
      const { data: allTasks } = await supabase
        .from('tasks').select('status, due_date, assigned_to')
        .eq('project_id', projectId)

      const statusCount = (allTasks ?? []).reduce((acc, t) => {
        acc[t.status] = (acc[t.status] ?? 0) + 1; return acc
      }, {})

      const today = new Date().toISOString().split('T')[0]
      const overdueCount = (allTasks ?? [])
        .filter(t => t.due_date && t.due_date < today && t.status !== 'done').length

      const uniqueMembers = new Set(
        (allTasks ?? []).map(t => t.assigned_to).filter(Boolean)
      ).size

      const total = allTasks?.length ?? 0
      const done  = statusCount['done'] ?? 0

      return {
        status: 200,
        body: JSON.stringify({
          total_tasks:     total,
          completion_rate: total > 0 ? Math.round((done / total) * 100) : 0,
          by_status:       statusCount,
          overdue_count:   overdueCount,
          active_members:  uniqueMembers,
        }),
        headers: { 'Content-Type': 'application/json' }
      }
    } catch (e) {
      return { status: 500, body: JSON.stringify({ error: e.message }), headers: { 'Content-Type': 'application/json' } }
    }
  }
})

// Phase 5 — Ajout/suppression de membres avec contrôle de rôle
app.http('manage-members', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    try {
      const authHeader = request.headers.get('authorization')
      if (!authHeader) return { status: 401, body: 'Unauthorized' }

      const userClient = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY,
        { global: { headers: { Authorization: authHeader } } }
      )
      const adminClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

      const { data: { user } } = await userClient.auth.getUser()
      if (!user) return { status: 401, body: 'Invalid token' }

      const body = await request.json()
      const { action, project_id, target_user_id, role } = body ?? {}

      const { data: callerRole } = await adminClient
        .from('project_members').select('role')
        .eq('project_id', project_id).eq('user_id', user.id).maybeSingle()

      if (!callerRole || !['admin', 'owner'].includes(callerRole.role)) {
        return { status: 403, body: JSON.stringify({ error: 'Admin requis' }), headers: { 'Content-Type': 'application/json' } }
      }

      if (action === 'add') {
        const { error } = await adminClient.from('project_members')
          .insert({ project_id, user_id: target_user_id, role: role ?? 'member' })
        return error
          ? { status: 400, body: JSON.stringify({ error: error.message }), headers: { 'Content-Type': 'application/json' } }
          : { status: 200, body: JSON.stringify({ success: true }), headers: { 'Content-Type': 'application/json' } }
      }

      if (action === 'remove') {
        const { data: target } = await adminClient
          .from('project_members').select('role')
          .eq('project_id', project_id).eq('user_id', target_user_id).maybeSingle()

        if (target?.role === 'owner') {
          return { status: 403, body: JSON.stringify({ error: 'Impossible de retirer le owner' }), headers: { 'Content-Type': 'application/json' } }
        }

        const { error } = await adminClient.from('project_members').delete()
          .eq('project_id', project_id).eq('user_id', target_user_id)
        return error
          ? { status: 400, body: JSON.stringify({ error: error.message }), headers: { 'Content-Type': 'application/json' } }
          : { status: 200, body: JSON.stringify({ success: true }), headers: { 'Content-Type': 'application/json' } }
      }

      return { status: 400, body: JSON.stringify({ error: 'action invalide' }), headers: { 'Content-Type': 'application/json' } }
    } catch (e) {
      return { status: 500, body: JSON.stringify({ error: e.message }), headers: { 'Content-Type': 'application/json' } }
    }
  }
})
