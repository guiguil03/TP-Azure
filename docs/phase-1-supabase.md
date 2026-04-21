# Phase 1 — Supabase : Base de données & Schéma

## Objectif
Créer et configurer la base de données PostgreSQL hébergée sur Supabase pour la plateforme TaskFlow.

## Services déployés

| Service | URL |
|---------|-----|
| Supabase Dashboard | https://supabase.com/dashboard/project/dkpsysydqdsmfciqoqwc |
| Supabase API URL | https://dkpsysydqdsmfciqoqwc.supabase.co |
| Supabase Anon Key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (voir `.env`) |

## Choix techniques

- **Supabase** : plateforme BaaS (Backend as a Service) open-source basée sur PostgreSQL. Choisi pour sa facilité de configuration, son Auth intégré, son Realtime natif et ses politiques RLS (Row Level Security).
- **PostgreSQL** : base relationnelle robuste, support natif des UUIDs, des triggers et des publications Realtime via WAL (Write-Ahead Log).

## Schéma de base de données

### Tables créées

```
profiles          — informations utilisateur (lié à auth.users)
projects          — projets créés par les utilisateurs
project_members   — membres d'un projet avec leur rôle (owner/admin/member)
tasks             — tâches associées à un projet
comments          — commentaires sur les tâches
notifications     — notifications utilisateur (assignation, etc.)
```

### Structure clé

```sql
-- Exemple : table tasks
CREATE TABLE tasks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid REFERENCES projects(id),
  title       text NOT NULL,
  status      text DEFAULT 'todo',        -- todo | in_progress | done
  priority    text DEFAULT 'medium',
  assigned_to uuid REFERENCES auth.users(id),
  due_date    date,
  created_by  uuid REFERENCES auth.users(id),
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);
```

## Ce qui a marché
- Création du projet Supabase sans problème
- Schéma déployé via SQL Editor


