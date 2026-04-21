# TODO — Ce qui reste à faire

---

## Phase 3 — Realtime (presque fini)

- [ ] Activer la réplication Realtime dans Supabase SQL Editor :
  ```sql
  ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
  ALTER PUBLICATION supabase_realtime ADD TABLE comments;
  ```
- [ ] Lancer le test collaboratif (2 terminaux) :
  ```bash
  # Terminal 1
  node phase-3-realtime/alice-watch.js

  # Terminal 2
  node phase-3-realtime/bob-actions.js
  ```
- [ ] Vérifier que le terminal 1 affiche :
  ```
  [Realtime] statut canal: SUBSCRIBED
  [RT] Nouvelle tâche: Implémenter le Realtime
  [RT] Statut: todo -> in_progress
  [RT] Commentaire: Je commence maintenant !
  ```

---

## Phase 4 — Azure Functions + Notifications email ✅ déployé

- [x] Azure CLI installé
- [x] `az login` effectué
- [x] Resource group `rg-taskflow` créé (swedencentral)
- [x] Storage account `stgtaskflow2025` créé
- [x] Function App `fn-taskflow-guill2025` créé
- [x] Variables d'env injectées
- [x] 4 fonctions déployées :
  - `https://fn-taskflow-guill2025.azurewebsites.net/api/notify-assigned`
  - `https://fn-taskflow-guill2025.azurewebsites.net/api/validate-task`
  - `https://fn-taskflow-guill2025.azurewebsites.net/api/project-stats`
  - `https://fn-taskflow-guill2025.azurewebsites.net/api/manage-members`
- [ ] Configurer le Webhook dans Supabase :
  - Dashboard → Database → Webhooks → Enable Webhooks
  - Create a new hook :
    - Name : `notify-task-assigned`
    - Table : `tasks` · Events : **UPDATE uniquement**
    - Type : HTTP Request · Method : POST
    - URL : `https://fn-taskflow-guill2025.azurewebsites.net/api/notify-assigned`
    - Header : `Content-Type: application/json`
- [ ] Tester : assigner une tâche → vérifier que `notifications` reçoit une entrée

---

## Phase 5 — Logique métier ✅ déployé (même Function App)

- [ ] Récupérer le JWT :
  ```bash
  node -e "import('./phase-2-auth/client.js').then(async ({supabase}) => { await supabase.auth.signInWithPassword({email:'guillaumel1103@gmail.com',password:'Guigui2003@'}); const {data:{session}} = await supabase.auth.getSession(); console.log(session.access_token) })"
  ```
- [ ] Tester `validate-task` (date passée → 400) :
  ```bash
  curl -X POST https://fn-taskflow-guill2025.azurewebsites.net/api/validate-task -H "Authorization: Bearer <JWT>" -H "Content-Type: application/json" -d "{\"project_id\":\"dbb27acc-f529-40f1-86a4-b43a700461b1\",\"title\":\"Ok\",\"due_date\":\"2020-01-01\"}"
  ```
- [ ] Tester `project-stats` :
  ```bash
  curl "https://fn-taskflow-guill2025.azurewebsites.net/api/project-stats?project_id=dbb27acc-f529-40f1-86a4-b43a700461b1"
  ```
- [ ] Tester `manage-members` (Bob simple membre → 403)

---

## Phase 6 — Intégration finale

- [ ] Lancer le script bout-en-bout :
  ```bash
  node phase-6-integration/integration.js
  ```
- [ ] Vérifier le résultat attendu :
  ```
  Alice et Bob connectes
  Projet cree, Bob ajoute via Azure Function
  3 taches creees via Azure Function
  [RT] todo -> in_progress  (x3)
  [RT] in_progress -> done  (x3)
  Alice a recu 6 evenements Realtime
  Completion : 100%
  Notifications Bob: 3
  ```

---

## Bonus — Monitoring & Tests de charge

- [ ] Créer Application Insights :
  ```powershell
  az monitor app-insights component create --app ai-taskflow --location swedencentral --resource-group rg-taskflow --application-type web
  ```
- [ ] Lier au Function App :
  ```powershell
  az functionapp config appsettings set --name fn-taskflow-guill2025 --resource-group rg-taskflow --settings "APPLICATIONINSIGHTS_CONNECTION_STRING=<connection-string>"
  ```
- [ ] Installer k6 : https://k6.io/docs/get-started/installation/
- [ ] Lancer le test de charge :
  ```bash
  k6 run -e PROJECT_ID=dbb27acc-f529-40f1-86a4-b43a700461b1 bonus/load-test.js
  ```

---

## Nettoyage final (OBLIGATOIRE après le TP)

- [ ] Supprimer toutes les ressources Azure :
  ```powershell
  az group delete --name rg-taskflow --yes --no-wait
  ```
