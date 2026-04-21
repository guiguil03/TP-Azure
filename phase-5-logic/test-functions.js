import { supabase } from '../phase-2-auth/client.js'

const BASE       = 'https://fn-taskflow-guill2025.azurewebsites.net/api'
const PROJECT_ID = 'dbb27acc-f529-40f1-86a4-b43a700461b1'
const BOB_ID     = '60234344-9974-424e-b5b5-1d723858d88d'

// 1. Récupérer le JWT de Guillaume
await supabase.auth.signInWithPassword({ email: 'guillaumel1103@gmail.com', password: 'Guigui2003@' })
const { data: { session } } = await supabase.auth.getSession()
const JWT = session.access_token
console.log('JWT récupéré ✅\n')

// Helper
async function test(name, fn) {
  try {
    const res = await fn()
    const body = await res.json()
    console.log(`[${res.status}] ${name}:`, JSON.stringify(body, null, 2))
  } catch(e) {
    console.error(`ERREUR ${name}:`, e.message)
  }
  console.log('---')
}

// 2. validate-task — titre trop court → 400
await test('validate-task (titre court → 400)', () =>
  fetch(`${BASE}/validate-task`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${JWT}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ project_id: PROJECT_ID, title: 'Ok', due_date: '2020-01-01' })
  })
)

// 3. validate-task — date passée → 400
await test('validate-task (date passée → 400)', () =>
  fetch(`${BASE}/validate-task`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${JWT}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ project_id: PROJECT_ID, title: 'Titre valide', due_date: '2020-01-01' })
  })
)

// 4. validate-task — valide → 201
await test('validate-task (valide → 201)', () =>
  fetch(`${BASE}/validate-task`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${JWT}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ project_id: PROJECT_ID, title: 'Tâche de test phase 5', priority: 'medium' })
  })
)

// 5. project-stats → 200
await test('project-stats (→ 200)', () =>
  fetch(`${BASE}/project-stats?project_id=${PROJECT_ID}`)
)

// 6. manage-members — Bob simple membre essaie d'ajouter → 403
await supabase.auth.signInWithPassword({ email: 'guillaumel2811@gmail.com', password: 'Guigui2003@' })
const { data: { session: bobSession } } = await supabase.auth.getSession()
const BOB_REAL_ID = bobSession.user.id

await test('manage-members (Bob simple membre → 403)', () =>
  fetch(`${BASE}/manage-members`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${bobSession.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'add', project_id: PROJECT_ID, target_user_id: BOB_REAL_ID, role: 'member' })
  })
)

// 7. manage-members — Guillaume owner ajoute Bob → 200
await supabase.auth.signInWithPassword({ email: 'guillaumel1103@gmail.com', password: 'Guigui2003@' })
const { data: { session: s2 } } = await supabase.auth.getSession()

await test('manage-members (Guillaume owner → 200)', () =>
  fetch(`${BASE}/manage-members`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${s2.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'add', project_id: PROJECT_ID, target_user_id: BOB_REAL_ID, role: 'member' })
  })
)

console.log('\nTous les tests phase 5 terminés.')
