# Phase 2 — Authentification & Row Level Security (RLS)

## Objectif
Mettre en place l'authentification Supabase et sécuriser toutes les tables avec des politiques RLS.

## Choix techniques

- **Supabase Auth** : système d'authentification intégré basé sur JWT (JSON Web Tokens). Gère l'inscription, la connexion et les sessions côté client.
- **Row Level Security (RLS)** : mécanisme PostgreSQL qui filtre les lignes selon l'identité de l'utilisateur (`auth.uid()`). Chaque table a des politiques `SELECT`, `INSERT`, `UPDATE`, `DELETE`.
- **SECURITY DEFINER** : utilisé pour la fonction `get_user_project_ids()` afin d'éviter la récursion infinie dans les politiques RLS.

## Fichiers

| Fichier | Rôle |
|---------|------|
| `phase-2-auth/client.js` | Clients Supabase (public + admin avec service key) |
| `phase-2-auth/auth.js` | Fonctions signIn / signUp / signOut |
| `phase-2-auth/rls.sql` | Toutes les politiques RLS à exécuter dans Supabase |
| `phase-2-auth/test-rls.js` | Tests de validation des politiques |

## Politiques RLS déployées

```sql
-- Fonction anti-récursion (OBLIGATOIRE)
CREATE OR REPLACE FUNCTION get_user_project_ids()
RETURNS SETOF uuid LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT project_id FROM project_members WHERE user_id = auth.uid();
$$;

-- Projects
CREATE POLICY "projects_read"   ON projects FOR SELECT USING (id IN (SELECT get_user_project_ids()));
CREATE POLICY "projects_insert" ON projects FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "projects_update" ON projects FOR UPDATE USING (owner_id = auth.uid());

-- Tasks
CREATE POLICY "tasks_read"   ON tasks FOR SELECT USING (project_id IN (SELECT get_user_project_ids()));
CREATE POLICY "tasks_insert" ON tasks FOR INSERT WITH CHECK (project_id IN (SELECT get_user_project_ids()));
CREATE POLICY "tasks_update" ON tasks FOR UPDATE USING (
  assigned_to = auth.uid() OR
  project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid() AND role IN ('admin','owner'))
);
```

## Ce qui a marché
- Auth Supabase fonctionnelle (signIn/signOut/signUp)
- JWT ES256 reconnu par PostgREST
- Politiques RLS correctement appliquées pour SELECT, INSERT, UPDATE

## Ce qui a bloqué

| Problème | Cause | Solution |
|----------|-------|----------|
| `infinite recursion detected in policy for relation "project_members"` | La politique `members_read` s'appelait elle-même via une sous-requête | Création de la fonction `get_user_project_ids()` avec `SECURITY DEFINER` qui bypass RLS |

| `Cannot coerce result to single JSON object` (PGRST116) | `.single()` sur 0 résultats lève une erreur | Remplacement par `.maybeSingle()` |
| `new row violates row-level security policy for table "tasks"` | Bob non membre du projet | INSERT de Bob dans `project_members` |
| RLS bloquant en Node.js (integration tests) | `global.headers.Authorization` non reconnu pour certaines tables | Utilisation du client `adminClient` (service key) pour les opérations de setup |
