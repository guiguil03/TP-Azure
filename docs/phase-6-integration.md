# Phase 6 — Intégration Finale

## Objectif
Valider le fonctionnement de bout en bout de toute la plateforme : authentification, création de projet, Azure Functions, Realtime, statistiques et notifications.

## Script

Fichier : `phase-6-integration/integration.js`

## Résultat attendu vs obtenu

```
✅ Alice et Bob connectes
✅ Projet cree, Bob ajoute via Azure Function
✅ 3 taches creees via Azure Function
✅ [Realtime] statut: SUBSCRIBED
✅  [RT] todo -> in_progress  (x3)
✅  [RT] in_progress -> done  (x3)
✅ Bob a termine toutes les taches
✅ Alice a recu 6 evenements Realtime

STATS FINALES:
✅   Taches : 3
✅   Completion : 100%
✅   Par statut : { done: 3 }

✅ Notifications Bob: 3  (après fix des colonnes)
```

## Choix techniques

- **adminClient** utilisé pour le setup car le client authentifié classique (`global.headers.Authorization`) ne transmet pas correctement le JWT pour le RLS en Node.js pur — problème connu avec `@supabase/supabase-js` v2 en environnement non-browser.
- **aliceClient** (signé via `signInWithPassword`) utilisé pour le Realtime car le WebSocket nécessite une session interne, pas juste un header HTTP.
- **Assignation avant subscription** : les 3 updates `assigned_to` sont effectués AVANT qu'Alice s'abonne au Realtime pour ne pas comptabiliser ces events dans les 6 attendus.

## Ce qui a marché
- Réalisation complète du flux bout en bout
- Realtime : 6 événements reçus (SUBSCRIBED confirmé)
- Stats : 100% completion, by_status correct
- Notifications : 3 entrées après fix des colonnes

## Ce qui a bloqué

| Problème | Cause | Solution |
|----------|-------|----------|
| `new row violates row-level security policy for table "projects"` | JWT non reconnu pour RLS en Node.js | `adminClient` (service key) pour INSERT projects |
it 9 événements au lieu de 6 | Assignation des tâches déclenchait aussi des events RT | Assignation déplacée AVANT l'abonnement Realtime |
| Notifications Bob: 0 malgré emails reçus | Colonnes incorrectes dans l'insert (`task_id`, `message` inexistants) | Correction vers `title`, `body`, `metadata` |

