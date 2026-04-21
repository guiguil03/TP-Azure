# JOURNAL — TP Serverless Master 2
**Binôme :** Guillaume L.  
**Date :** 21 avril 2026  
**Projet Supabase :** taskflow

---

## Phase 1 — Setup & Modélisation (45 min)

### Choix techniques
- Projet Supabase créé sur la région West EU (latence optimale depuis Paris).
- Schéma SQL exécuté en une seule requête dans l'éditeur SQL Supabase.
- Trigger `updated_at` mis en place sur la table `tasks` via une fonction PL/pgSQL.

### URLs des services
- **Supabase URL :** `https://[project-id].supabase.co` (voir `.env`)

### Ce qui a marché
- Les 6 tables créées sans erreur : `profiles`, `projects`, `project_members`, `tasks`, `comments`, `notifications`.
- Trigger `tasks_updated_at` fonctionnel : un UPDATE sur tasks met bien à jour `updated_at`.
- 2 profils et 3 tâches de test insérés.

### Ce qui a bloqué
- Rien de bloquant sur cette phase.

---

## Phase 2 — Authentification & Row Level Security (45 min)

### Choix techniques
- Projet Node.js initialisé avec `@supabase/supabase-js` et `dotenv`.
- `"type": "module"` ajouté dans `package.json` pour utiliser la syntaxe ES modules (`import/export`).
- Deux clients Supabase créés : `supabase` (anon key, côté client) et `supabaseAdmin` (service key, côté serveur uniquement).
- RLS activé sur toutes les tables avec des politiques restrictives par défaut.

### Ce qui a marché
- `client.js` et `auth.js` créés conformément au TP.
- `signIn` / `signOut` / `signUp` fonctionnels.
- Test 1 (sans auth → 0 résultats) : **OK**.

### Ce qui a bloqué — Récursion infinie dans `project_members`

**Problème :** La politique `members_read` causait une récursion infinie :
```sql
-- PROBLÈME : la politique requête la même table qu'elle protège
CREATE POLICY "members_read" ON project_members FOR SELECT
USING (project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid()));
```
Toutes les requêtes sur `tasks`, `projects` et `comments` échouaient silencieusement car elles passent toutes par `project_members`.

**Solution :** Création d'une fonction `SECURITY DEFINER` qui contourne le RLS :
```sql
CREATE OR REPLACE FUNCTION get_user_project_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT project_id FROM project_members WHERE user_id = auth.uid();
$$;
```
Toutes les politiques utilisant `project_members` ont été réécrites pour appeler cette fonction.

**Résultat après correction :**
```
Sans auth: 0 (attendu: 0)     ✅
Session uid: 79119db6-...      ✅
Tasks Guillaume: 0             ⚠ (données de test manquantes)
Projets Guillaume: 0           ⚠ (données de test manquantes)
Modif refusée: (tâche de Bob non visible, RLS fonctionne) ✅
```

Les 0 résultats sur les tâches et projets sont dus à l'absence de données de test (Guillaume pas encore dans `project_members`), pas à un problème RLS.

---

## Phase 3 — CRUD, Uploads & Temps réel (60 min)

### Choix techniques
- **Uploadthing** choisi pour l'upload de fichiers : 2 Go gratuits sans CB.
  - Compte créé sur uploadthing.com avec GitHub.
  - App `taskflow` créée, clés `UPLOADTHING_SECRET` et `UPLOADTHING_APP_ID` ajoutées dans `.env`.
- `upload.js` : définit le router Uploadthing avec types acceptés (image 4MB, PDF 8MB). La partie `generateUploadButton` (React) a été retirée car le projet est Node.js pur.
- `task.js` : service CRUD complet avec jointures sur les profils et comptage des commentaires.
- `realtime.js` : souscription Supabase Realtime aux changements sur `tasks` et `comments`, avec gestion de la présence (qui est connecté).

### Fichiers créés
| Fichier | Rôle |
|---------|------|
| `upload.js` | Router Uploadthing (types de fichiers acceptés, middleware auth) |
| `task.js` | CRUD tâches : `getProjectTasks`, `createTask`, `updateTaskStatus`, `assignTask`, `addComment` |
| `realtime.js` | Souscription temps réel : INSERT/UPDATE/DELETE sur tasks, INSERT comments, présence |
| `alice-watch.js` | Terminal 1 — Alice écoute les événements Realtime |
| `bob-actions.js` | Terminal 2 — Bob crée une tâche, change le statut, ajoute un commentaire |

### Ce qui a marché
- `task.js` : les fonctions CRUD sont opérationnelles avec RLS respecté.
- `realtime.js` : souscription aux changements Postgres via WebSocket Supabase.
- Uploadthing installé (`npm install uploadthing`).

### Ce qui a bloqué

**Problème 1 — Import React incompatible**
`upload.js` importait `generateUploadButton` depuis `uploadthing/react`, un package prévu pour React qui ne fonctionne pas dans un contexte Node.js pur.
```js
// SUPPRIMÉ — incompatible Node.js
import { generateUploadButton } from 'uploadthing/react'
```
**Solution :** suppression de la ligne, le router `uploadthing/server` suffit pour ce TP.

---

**Problème 2 — RLS bloque la création de tâche par Bob**

Erreur : `new row violates row-level security policy for table "tasks"`

Bob (guillaumel2811@gmail.com) n'était pas dans `project_members` pour le projet de test. La policy `tasks_insert` exige d'être membre :
```sql
WITH CHECK (project_id IN (SELECT get_user_project_ids()))
```
**Solution :** insertion manuelle de Bob dans `project_members` via SQL :
```sql
INSERT INTO project_members (project_id, user_id, role)
VALUES ('dbb27acc-f529-40f1-86a4-b43a700461b1', '<UUID-BOB>', 'member');
```

---

**Problème 3 — Bob ne peut pas mettre à jour la tâche qu'il vient de créer**

Erreur : `Cannot coerce the result to a single JSON object` (code `PGRST116`, 0 rows)

La policy `tasks_update` n'autorise la modification que si l'utilisateur est assigné à la tâche ou est admin/owner. Bob créait la tâche sans s'y assigner, donc le `UPDATE` retournait 0 lignes.
```js
// AVANT — pas d'assignation
const task = await createTask(PROJECT_ID, { title: 'Implémenter le Realtime', priority: 'high' })

// APRÈS — Bob récupère son ID et s'assigne
const { data: { user } } = await supabase.auth.getUser()
const task = await createTask(PROJECT_ID, { title: 'Implémenter le Realtime', priority: 'high', assignedTo: user.id })
```

---

**Problème 4 — Aucun événement Realtime reçu dans alice-watch.js**

Le terminal d'Alice ne recevait rien malgré la souscription active.

**Cause :** Supabase n'active pas la réplication Realtime sur les tables par défaut.

**Solution :** activation explicite via SQL :
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE comments;
```
Ou via Dashboard → Database → Replication → cocher `tasks` et `comments`.

Un log de statut a aussi été ajouté dans `realtime.js` pour diagnostiquer l'état de la connexion :
```js
channel.subscribe(async (status) => {
  console.log('[Realtime] statut canal:', status)  // SUBSCRIBED, CHANNEL_ERROR...
  ...
})
```

### Validation Phase 3
- [x] `getProjectTasks()` retourne les tâches avec profils et comptage commentaires
- [x] Compte Uploadthing créé, clés dans `.env`
- [x] La colonne `file_url` existe dans la table `tasks`
- [x] Bob membre du projet, tâches créées et modifiées avec succès
- [ ] Événements Realtime reçus par Alice en temps réel (en attente activation Replication)

---

## Phase 4 — Azure Functions — Notifications email (60 min)

### Choix techniques
- **Resend** utilisé pour l'envoi d'emails (100 emails/jour, 3000/mois gratuits, sans CB).
- Azure Functions v4, runtime Node.js 20, plan Consumption (gratuit).
- Architecture webhook : Supabase détecte un UPDATE sur `tasks` → POST vers la Function → email + notification en base.

### Commandes exécutées
```bash
az group create --name rg-taskflow --location westeurope
az storage account create --name stgtaskflow --resource-group rg-taskflow --location westeurope --sku Standard_LRS
az functionapp create --resource-group rg-taskflow --consumption-plan-location westeurope --runtime node --runtime-version 20 --functions-version 4 --name fn-taskflow --storage-account stgtaskflow --os-type Linux

mkdir taskflow-functions && cd taskflow-functions
func init --language javascript --worker-runtime node
func new --name notify-assigned --template "HTTP trigger" --authlevel anonymous
func azure functionapp publish fn-taskflow
```

### Webhook Supabase configuré
- Dashboard → Database → Webhooks → `notify-task-assigned`
- Table : `tasks`, Event : UPDATE uniquement
- URL : `https://fn-taskflow.azurewebsites.net/api/notify-assigned`

### Ce qui a marché
- Compte Resend créé, clé API dans `.env` et settings Azure.
- Function App déployé, visible dans le portail Azure.
- Webhook déclenché sur UPDATE de `tasks`.

### Ce qui a bloqué
- Vérification des logs : `az functionapp logs tail --name fn-taskflow --resource-group rg-taskflow`

### Validation Phase 4
- [x] Compte Resend créé
- [x] Function App `fn-taskflow` déployé
- [x] Webhook Supabase configuré sur UPDATE de tasks
- [x] Assignation → notification insérée dans `notifications`

---

## Phase 5 — Logique métier serverless (60 min)

### Choix techniques
- 3 nouvelles fonctions dans le même Function App `fn-taskflow`.
- `validate-task` : validation côté serveur (titre ≥ 3 chars, date non passée, assigné membre du projet).
- `project-stats` : statistiques agrégées (taux de complétion, retards, membres actifs).
- `manage-members` : ajout/suppression de membres avec contrôle de rôle (admin/owner uniquement, owner non retirable).

### Fonctions déployées
| Fonction | Endpoint | Auth |
|----------|----------|------|
| `notify-assigned` | POST `/api/notify-assigned` | webhook Supabase |
| `validate-task` | POST `/api/validate-task` | Bearer JWT |
| `project-stats` | GET `/api/project-stats?project_id=` | service key |
| `manage-members` | POST `/api/manage-members` | Bearer JWT |

### Ce qui a marché
- `validate-task` rejette titre court, date passée, non-membre assigné.
- `project-stats` calcule le taux de complétion et les tâches en retard.
- `manage-members` : 403 si simple membre, owner non retirable.

### Commandes de test
```bash
# Récupérer le JWT
node -e "import('./client.js').then(async ({supabase}) => { await supabase.auth.signInWithPassword({email:'guillaumel1103@gmail.com', password:'Guigui2003@'}); const {data:{session}} = await supabase.auth.getSession(); console.log(session.access_token) })"

# Test validate-task (date passée → 400)
curl -X POST https://fn-taskflow.azurewebsites.net/api/validate-task \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{"project_id":"aaaaaaaa-0000-0000-0000-000000000001","title":"Ok","due_date":"2020-01-01"}'

# Test project-stats
curl "https://fn-taskflow.azurewebsites.net/api/project-stats?project_id=aaaaaaaa-0000-0000-0000-000000000001"
```

---

## Phase 6 — Intégration finale (60 min)

### Résultat du script `integration.js`
```
━━━ INTÉGRATION TASKFLOW ━━━
✅ Alice et Bob connectés
✅ Projet créé, Bob ajouté via Azure Function
✅ 3 tâches créées via Azure Function
  [RT] todo → in_progress
  [RT] in_progress → done
  [RT] todo → in_progress
  [RT] in_progress → done
  [RT] todo → in_progress
  [RT] in_progress → done
✅ Bob a terminé toutes les tâches
✅ Alice a reçu 6 événements Realtime
📊 STATS FINALES:
  Tâches : 3
  Complétion : 100%
  Par statut : { done: 3 }
🔔 Notifications Bob: 3
━━━ FIN — TOUS LES SYSTÈMES FONCTIONNELS ━━━
```

### Validation Phase 6
- [x] `integration.js` tourne sans erreur
- [x] Complétion : 100%
- [x] Alice reçoit 6 événements Realtime (2 × 3 tâches)
- [x] Table `notifications` contient des entrées pour Bob
- [x] Azure Functions répondent en < 500ms

---

## Récapitulatif des outils utilisés

| Outil | Usage | Limite gratuite |
|-------|-------|----------------|
| Supabase | DB PostgreSQL + Auth + Realtime | 2 projets, 500 Mo DB |
| Azure Functions | 4 fonctions serverless | 1 M appels/mois |
| Resend | Emails de notification | 3 000 emails/mois |
| Uploadthing | Upload pièces jointes | 2 Go stockage |
| k6 | Tests de charge | 100 % gratuit |

---

## Problèmes rencontrés et solutions

| Problème | Cause | Solution |
|----------|-------|----------|
| `SyntaxError: Cannot use import statement outside a module` | `package.json` manquait `"type": "module"` | Ajout de `"type": "module"` |
| `infinite recursion detected in policy for relation "project_members"` | La politique RLS se requêtait elle-même | Fonction `SECURITY DEFINER get_user_project_ids()` |
| `Tasks Guillaume: 0` après correction RLS | Guillaume absent de `project_members` | Insertion des données de test en SQL |
| `Cannot coerce the result to a single JSON object` (test-rls) | `.single()` sur 0 résultats | Remplacement par `.maybeSingle()` |
| Import `uploadthing/react` en Node.js | Package React non compatible | Retrait de `generateUploadButton` de `upload.js` |
| `new row violates row-level security policy for table "tasks"` | Bob absent de `project_members` | INSERT de Bob dans `project_members` via SQL |
| `Cannot coerce the result to a single JSON object` (bob-actions) | `tasks_update` bloque car tâche non assignée à Bob | Ajout de `assignedTo: user.id` à la création de tâche |
| Aucun événement Realtime reçu | Réplication non activée sur la table `tasks` | `ALTER PUBLICATION supabase_realtime ADD TABLE tasks` |
