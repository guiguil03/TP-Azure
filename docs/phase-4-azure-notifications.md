# Phase 4 — Azure Functions & Notifications Email

## Objectif
Déployer des Azure Functions serverless pour envoyer des emails de notification lors de l'assignation d'une tâche, et insérer des entrées dans la table `notifications`.

## Services déployés

| Service | URL / Nom |
|---------|-----------|
| Resource Group | `rg-taskflow` (swedencentral) |
| Storage Account | `stgtaskflow2025` |
| Function App | `fn-taskflow-guill2025` |
| Endpoint notify-assigned | `https://fn-taskflow-guill2025.azurewebsites.net/api/notify-assigned` |
| Application Insights | `ai-taskflow` (swedencentral) |

## Choix techniques

- **Azure Functions v4 Node.js** : modèle de programmation v4 avec `app.http()` depuis `@azure/functions`. Plus moderne que le v3 (function.json + module.exports), permet de définir toutes les fonctions dans un seul fichier.
- **ESM (ES Modules)** : `"type": "module"` dans `package.json`, imports `import` natifs.
- **Resend** : service d'envoi d'emails transactionnels. API simple, plan gratuit suffisant pour le TP.
- **Supabase Webhook** : déclenche la fonction `notify-assigned` lors d'un UPDATE sur la table `tasks`. Vérifie si `assigned_to` a changé avant d'envoyer.
- **Application Insights** : monitoring Azure pour tracer les invocations et erreurs des fonctions.

## Variables d'environnement Azure

```
SUPABASE_URL=https://dkpsysydqdsmfciqoqwc.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_KEY=...
RESEND_API_KEY=re_XncjLh9R_...
APPLICATIONINSIGHTS_CONNECTION_STRING=InstrumentationKey=05d05e36-...
```

## Webhook Supabase

Configuré dans **Supabase → Database → Webhooks** :

| Champ | Valeur |
|-------|--------|
| Name | `notify-task-assigned` |
| Table | `tasks` |
| Events | UPDATE uniquement |
| URL | `https://fn-taskflow-guill2025.azurewebsites.net/api/notify-assigned` |
| Header | `Content-Type: application/json` |


## Ce qui a marché
- Déploiement Azure Functions réussi (4 fonctions)
- Emails reçus via Resend lors de l'assignation
- Notifications insérées dans la table après correction des noms de colonnes

## Ce qui a bloqué

| Problème | Cause | Solution |
|----------|-------|----------|
| `westeurope` region bloquée | Azure for Students n'autorise pas toutes les régions | Changement vers `swedencentral` |

| Migration v3 → v4 nécessaire | `module.exports` + `function.json` non compatibles avec le runtime déployé | Réécriture avec `app.http()` dans `src/functions.js`, `"type": "module"` |
