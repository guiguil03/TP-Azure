// realtime.js
import { supabase } from './client.js'
export function subscribeToProject(projectId, callbacks) {
const channel = supabase.channel(`project:${projectId}`)
channel.on('postgres_changes',
{ event: '*', schema: 'public', table: 'tasks', filter:
`project_id=eq.${projectId}` },
(payload) => {
if (payload.eventType === 'INSERT') callbacks.onTaskCreated?.(payload.new)
if (payload.eventType === 'UPDATE') callbacks.onTaskUpdated?.(payload.new,
payload.old)
if (payload.eventType === 'DELETE') callbacks.onTaskDeleted?.(payload.old)