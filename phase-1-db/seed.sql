-- Phase 1.3 — Données de test
-- Remplacer UUID-USER-1 et UUID-USER-2 par les vrais UUIDs
-- Supabase > Authentication > Users > copier l'UUID

INSERT INTO profiles (id, username, full_name) VALUES
  ('UUID-USER-1', 'guillaume', 'Guillaume L.'),
  ('UUID-USER-2', 'bob',       'Bob Dupont');

INSERT INTO projects (id, name, description, owner_id) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Refonte API', 'Migration vers serverless', 'UUID-USER-1');

INSERT INTO project_members (project_id, user_id, role) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', 'UUID-USER-1', 'owner'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'UUID-USER-2', 'member');

INSERT INTO tasks (project_id, title, status, priority, assigned_to, created_by) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Configurer Supabase', 'done',        'high',   'UUID-USER-1', 'UUID-USER-1'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Implémenter RLS',     'in_progress', 'high',   'UUID-USER-1', 'UUID-USER-1'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Connecter Azure',     'todo',        'medium', 'UUID-USER-2', 'UUID-USER-1');
