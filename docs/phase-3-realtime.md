# Phase 3 — Realtime & Upload

## Choix techniques

- **Supabase Realtime** : diffuse les changements de la base de données via WebSocket en utilisant le WAL (Write-Ahead Log) PostgreSQL. Utilise le pattern `postgres_changes` pour s'abonner aux événements INSERT/UPDATE/DELETE.
- **Publication Realtime** : les tables doivent être explicitement ajoutées à la publication `supabase_realtime` pour recevoir les événements.
- **Uploadthing** : service d'upload de fichiers. Utilisé uniquement côté Node.js (pas de composants React).

## Fichiers

| Fichier | Rôle |
|---------|------|
| `phase-3-realtime/task.js` | CRUD tâches : getProjectTasks, createTask, updateTaskStatus, assignTask, addComment |
| `phase-3-realtime/realtime.js` | Abonnement Realtime aux changements de tâches et commentaires |
| `phase-3-realtime/upload.js` | Router Uploadthing pour les fichiers |
| `phase-3-realtime/alice-watch.js` | Alice écoute les événements en temps réel |
| `phase-3-realtime/bob-actions.js` | Bob crée et modifie des tâches |

## Activation Realtime

```sql
-- À exécuter dans Supabase SQL Editor
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE comments;
```

## Ce qui a marché
- Souscription Realtime fonctionnelle après activation de la publication
- Événements UPDATE reçus en temps réel par Alice quand Bob modifie les tâches
- Statut `SUBSCRIBED` confirmé avant traitement des événements


