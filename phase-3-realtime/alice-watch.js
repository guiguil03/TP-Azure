import { signIn } from '../phase-2-auth/auth.js'
import { subscribeToProject } from './realtime.js'

const EMAIL      = 'guillaumel1103@gmail.com'
const PASSWORD   = 'Guigui2003@'
const PROJECT_ID = process.env.TEST_PROJECT_ID ?? 'dbb27acc-f529-40f1-86a4-b43a700461b1'

await signIn(EMAIL, PASSWORD)
console.log('Guillaume connecté, écoute du projet', PROJECT_ID)

const unsub = subscribeToProject(PROJECT_ID, {
  onTaskCreated:    (t) => console.log('[RT] Nouvelle tâche:', t.title),
  onTaskUpdated:    (n, o) => console.log(`[RT] Statut: ${o.status} -> ${n.status}`),
  onCommentAdded:   (c) => console.log('[RT] Commentaire:', c.content),
  onPresenceChange: (u) => console.log('[RT] En ligne:', u.length, 'utilisateur(s)'),
})

process.on('SIGINT', () => { unsub(); process.exit() })
