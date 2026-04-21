import { signIn } from '../phase-2-auth/auth.js'
import { createTask, updateTaskStatus, addComment } from './task.js'
import { supabase } from '../phase-2-auth/client.js'

const EMAIL      = 'guillaumel2811@gmail.com'
const PASSWORD   = 'Guigui2003@'
const PROJECT_ID = process.env.TEST_PROJECT_ID ?? 'dbb27acc-f529-40f1-86a4-b43a700461b1'

await signIn(EMAIL, PASSWORD)
const { data: { user } } = await supabase.auth.getUser()
console.log('Bob connecté:', user.id)

const task = await createTask(PROJECT_ID, {
  title:      'Implémenter le Realtime',
  priority:   'high',
  assignedTo: user.id,
})
console.log('Tâche créée:', task.id)

await new Promise(r => setTimeout(r, 1000))
await updateTaskStatus(task.id, 'in_progress')
console.log('Statut -> in_progress')

await new Promise(r => setTimeout(r, 1000))
await addComment(task.id, 'Je commence maintenant !')
console.log('Commentaire ajouté')

process.exit()
