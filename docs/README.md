# Documentation TaskFlow — TP Serverless M2

## Présentation

TaskFlow est une plateforme de gestion de tâches serverless construite avec **Supabase** (BaaS) et **Azure Functions** (Serverless).

## Services en production

| Service | URL |
|---------|-----|
| Supabase API | https://dkpsysydqdsmfciqoqwc.supabase.co |
| Supabase Dashboard | https://supabase.com/dashboard/project/dkpsysydqdsmfciqoqwc |
| Azure Function App | https://fn-taskflow-guill2025.azurewebsites.net/api |
| validate-task | https://fn-taskflow-guill2025.azurewebsites.net/api/validate-task |
| project-stats | https://fn-taskflow-guill2025.azurewebsites.net/api/project-stats |
| manage-members | https://fn-taskflow-guill2025.azurewebsites.net/api/manage-members |
| notify-assigned | https://fn-taskflow-guill2025.azurewebsites.net/api/notify-assigned |

## Structure du projet

```
taskflow-client/
├── phase-2-auth/          Phase 2 — Auth Supabase + RLS
├── phase-3-realtime/      Phase 3 — Realtime + Upload
├── phase-5-logic/         Phase 5 — Tests des Azure Functions
├── phase-6-integration/   Phase 6 — Test d'intégration bout en bout
├── taskflow-functions/    Azure Functions (déployées sur fn-taskflow-guill2025)
│   └── src/functions.js   Toutes les fonctions v4 (notify, validate, stats, members)
├── bonus/                 Test de charge k6
└── docs/                  Documentation par phase (ce dossier)
```

## Documentation par phase

| Phase | Fichier | Contenu |
|-------|---------|---------|
| Phase 1 | [phase-1-supabase.md](./phase-1-supabase.md) | Schéma BDD, tables, Supabase setup |
| Phase 2 | [phase-2-auth-rls.md](./phase-2-auth-rls.md) | Auth JWT, politiques RLS, SECURITY DEFINER |
| Phase 3 | [phase-3-realtime.md](./phase-3-realtime.md) | Realtime WebSocket, postgres_changes, Upload |
| Phase 4 | [phase-4-azure-notifications.md](./phase-4-azure-notifications.md) | Azure Functions, Resend, Webhook Supabase |
| Phase 5 | [phase-5-logique-metier.md](./phase-5-logique-metier.md) | validate-task, project-stats, manage-members |
| Phase 6 | [phase-6-integration.md](./phase-6-integration.md) | Test bout en bout, résultats |
| Bonus | [bonus-monitoring.md](./bonus-monitoring.md) | Application Insights, k6 load test |

## Stack technique

| Technologie | Rôle |
|-------------|------|
| Supabase | BaaS : PostgreSQL, Auth, RLS, Realtime, Storage |
| Azure Functions v4 | Serverless : logique métier, notifications |
| Node.js 20 | Runtime |
| @supabase/supabase-js v2 | Client Supabase |
| @azure/functions v4 | SDK Azure Functions |
| Resend | Emails transactionnels |
| k6 | Tests de charge |
| Application Insights | Monitoring Azure |

## Résultats finaux

- ✅ Phase 1 — Schéma Supabase déployé
- ✅ Phase 2 — Auth + RLS fonctionnel
- ✅ Phase 3 — Realtime 6 événements reçus
- ✅ Phase 4 — Emails envoyés, notifications insérées
- ✅ Phase 5 — 6/6 tests passent
- ✅ Phase 6 — Intégration bout en bout fonctionnelle
- ✅ Bonus — Application Insights + k6
