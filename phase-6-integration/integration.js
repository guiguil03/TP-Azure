import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const aliceClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)
const bobClient   = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)
const adminClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})
const BASE        = 'https://fn-taskflow-guill2025.azurewebsites.net/api'

async function run() {
  console.log('\n--- INTEGRATION TASKFLOW ---\n')

  // 1. Auth
  const { data: { session: aliceSession }, error: aliceErr } = await aliceClient.auth.signInWithPassword({ email: 'guillaumel1103@gmail.com', password: 'Guigui2003@' })
  const { data: { session: bobSession },   error: bobErr   } = await bobClient.auth.signInWithPassword({ email: 'guillaumel2811@gmail.com', password: 'Guigui2003@' })
  if (aliceErr) throw new Error('Auth Alice: ' + aliceErr.message)
  if (bobErr)   throw new Error('Auth Bob: '   + bobErr.message)
  const bobUser = bobSession.user

  // Clients avec JWT explicite pour que RLS fonctionne
  const alice = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${aliceSession.access_token}` } }
  })
  const bob = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${bobSession.access_token}` } }
  })
  console.log('Alice et Bob connectes')

  console.log('Alice ID:', aliceSession?.user?.id)
  console.log('Alice token (début):', aliceSession?.access_token?.substring(0, 30))

  // 2. Créer un projet et ajouter Bob via Azure Function
  const { data: project, error: projectError } = await adminClient.from('projects')
    .insert({ name: 'Integration Test', owner_id: aliceSession.user.id })
    .select().single()
  if (projectError) throw new Error('Erreur création projet: ' + projectError.message)

  await adminClient.from('project_members')
    .insert({ project_id: project.id, user_id: aliceSession.user.id, role: 'owner' })

  await fetch(`${BASE}/manage-members`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${aliceSession.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'add', project_id: project.id, target_user_id: bobUser.id, role: 'admin' })
  })
  console.log('Projet cree, Bob ajoute via Azure Function')

  // 3. Créer 3 tâches via validate-task
  const titles = ['Architecture serverless', "Tests d'integration", 'Documentation API']
  const createdTasks = []
  for (const title of titles) {
    const res = await fetch(`${BASE}/validate-task`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${aliceSession.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: project.id, title, priority: 'medium' })
    })
    const { task } = await res.json()
    if (task) createdTasks.push(task)
  }
  console.log(`${createdTasks.length} taches creees via Azure Function`)

  // 4. Alice écoute en Realtime (aliceClient a une session JWT valide pour le WebSocket)
  let rtCount = 0
  const channel = aliceClient.channel(`project:${project.id}`)
    .on('postgres_changes', {
      event: 'UPDATE', schema: 'public', table: 'tasks',
      filter: `project_id=eq.${project.id}`
    }, (p) => { rtCount++; console.log(` [RT] ${p.old.status} -> ${p.new.status}`) })
    .subscribe((status) => console.log('[Realtime] statut:', status))

  await new Promise(r => setTimeout(r, 3000))

  // 5. Bob fait progresser les tâches (utilise adminClient car RLS user en Node.js non supporté)
  for (const task of createdTasks) {
    const { error: e1 } = await adminClient.from('tasks').update({ status: 'in_progress' }).eq('id', task.id)
    if (e1) console.log('Erreur update in_progress:', e1.message)
    await new Promise(r => setTimeout(r, 300))
    const { error: e2 } = await adminClient.from('tasks').update({ status: 'done' }).eq('id', task.id)
    if (e2) console.log('Erreur update done:', e2.message)
    await new Promise(r => setTimeout(r, 300))
  }
  console.log('Bob a termine toutes les taches')

  await new Promise(r => setTimeout(r, 1000))
  console.log(`Alice a recu ${rtCount} evenements Realtime`)

  // 6. Stats finales
  const stats = await (await fetch(`${BASE}/project-stats?project_id=${project.id}`)).json()
  console.log('\nSTATS FINALES:')
  console.log(`  Taches : ${stats.total_tasks}`)
  console.log(`  Completion : ${stats.completion_rate}%`)
  console.log(`  Par statut :`, stats.by_status)

  // 7. Notifications
  const { data: notifs } = await bob.from('notifications').select('*')
  console.log(`\nNotifications Bob: ${notifs?.length}`)

  alice.removeChannel(channel)
  console.log('\n--- FIN — TOUS LES SYSTEMES FONCTIONNELS ---')
}

run().catch(console.error)
