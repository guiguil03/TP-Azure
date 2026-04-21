import { supabase } from './client.js'
import { signIn, signOut } from './auth.js'

// Test 1 : sans auth → tout vide
const { data: noAuth, error: e0 } = await supabase.from('tasks').select('*')
console.log('Sans auth:', noAuth?.length, '(attendu: 0)', e0 ? '| erreur: ' + e0.message : '')

// Test 2 : Guillaume voit ses tâches
const { error: signInError } = await signIn('guillaumel1103@gmail.com', 'Guigui2003@')
if (signInError) { console.error('SignIn échoué:', signInError.message); process.exit(1) }

const { data: session } = await supabase.auth.getSession()
console.log('Session uid:', session?.session?.user?.id ?? '⚠ pas de session')

const { data: tasks, error: e1 } = await supabase.from('tasks').select('*')
console.log('Tasks Guillaume:', tasks?.length, e1 ? '| erreur: ' + e1.message : '')

const { data: members, error: e2 } = await supabase.from('project_members').select('project_id, role')
console.log('Projets Guillaume:', members?.length, e2 ? '| erreur: ' + e2.message : '', members)

// Test 3 : Guillaume ne peut pas modifier la tâche de Bob
const { data: bobTask, error: e3 } = await supabase
  .from('tasks').select('id').eq('assigned_to', '60234344-9974-424e-b5b5-1d723858d88d').maybeSingle()
console.log('BobTask:', bobTask?.id ?? 'non trouvée', e3 ? '| erreur: ' + e3.message : '')

if (bobTask?.id) {
  const { error } = await supabase.from('tasks').update({ title: 'Hacked' }).eq('id', bobTask.id)
  console.log('Modif refusée:', error?.message ?? '⚠ ERREUR : accès accordé !')
} else {
  console.log('Modif refusée: (tâche de Bob non visible, RLS fonctionne)')
}

await signOut()
