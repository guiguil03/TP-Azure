-- Phase 2.3 — Row Level Security
-- Exécuter dans Supabase > SQL Editor

-- Fonction helper anti-récursion (OBLIGATOIRE avant les policies)
CREATE OR REPLACE FUNCTION get_user_project_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT project_id FROM project_members WHERE user_id = auth.uid();
$$;

-- Activation RLS
ALTER TABLE profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects        ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks           ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications   ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "profiles_read"   ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Projects
CREATE POLICY "projects_read"   ON projects FOR SELECT USING (id IN (SELECT get_user_project_ids()));
CREATE POLICY "projects_update" ON projects FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "projects_insert" ON projects FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Project members (utilise la fonction pour éviter la récursion infinie)
CREATE POLICY "members_read" ON project_members FOR SELECT
  USING (project_id IN (SELECT get_user_project_ids()));

-- Tasks
CREATE POLICY "tasks_read" ON tasks FOR SELECT
  USING (project_id IN (SELECT get_user_project_ids()));

CREATE POLICY "tasks_insert" ON tasks FOR INSERT
  WITH CHECK (project_id IN (SELECT get_user_project_ids()));

CREATE POLICY "tasks_update" ON tasks FOR UPDATE
  USING (
    assigned_to = auth.uid() OR
    project_id IN (
      SELECT project_id FROM project_members
      WHERE user_id = auth.uid() AND role IN ('admin','owner')
    )
  );

-- Comments
CREATE POLICY "comments_read" ON comments FOR SELECT
  USING (task_id IN (
    SELECT id FROM tasks WHERE project_id IN (SELECT get_user_project_ids())
  ));

CREATE POLICY "comments_insert" ON comments FOR INSERT
  WITH CHECK (author_id = auth.uid());

-- Notifications
CREATE POLICY "notifs_read"   ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notifs_update" ON notifications FOR UPDATE USING (user_id = auth.uid());
