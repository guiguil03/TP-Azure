# Phase 5 — Logique Métier (Azure Functions)

## Objectif
Implémenter des règles métier avancées via Azure Functions : validation de tâches, statistiques de projet, gestion des membres avec contrôle de rôle.

## Endpoints déployés

| Fonction | URL | Méthode |
|----------|-----|---------|
| validate-task | `https://fn-taskflow-guill2025.azurewebsites.net/api/validate-task` | POST |
| project-stats | `https://fn-taskflow-guill2025.azurewebsites.net/api/project-stats` | GET |
| manage-members | `https://fn-taskflow-guill2025.azurewebsites.net/api/manage-members` | POST |

## Choix techniques

- **validate-task** : valide les données côté serveur (titre ≥ 3 chars, date non passée, assigné membre du projet) avant d'insérer la tâche dans Supabase. Utilise le JWT de l'utilisateur pour respecter le RLS.
- **project-stats** : agrège les statistiques d'un projet (total tâches, taux de complétion, répartition par statut, retards, membres actifs). Utilise la service key pour bypass RLS.
- **manage-members** : contrôle d'accès basé sur les rôles (owner/admin requis). Utilise un double client : user client pour vérifier le JWT, admin client pour les mutations.

## Règles de validation (validate-task)

```
✅ Titre ≥ 3 caractères
✅ Titre ≤ 200 caractères
✅ Date d'échéance dans le futur (si fournie)
✅ Utilisateur assigné est membre du projet (si fourni)
→ 400 si erreurs, 201 si tâche créée
```

## Résultats des tests Phase 5

```
[400] validate-task (titre court → 400) ✅
[400] validate-task (date passée → 400) ✅
[201] validate-task (valide → 201) ✅
[200] project-stats (→ 200) ✅
[403] manage-members (Bob simple membre → 403) ✅
[200] manage-members (Guillaume owner → 200) ✅
```

## Ce qui a marché
- Toutes les validations métier fonctionnelles
- Contrôle de rôle (owner/admin) opérationnel
- Statistiques agrégées correctes

## Ce qui a bloqué

| Problème | Cause | Solution |
|----------|-------|----------|
| Fonctions retournaient 500 corps vide | `node_modules` absent + modèle v3 incompatible | Migration vers modèle v4 (`app.http()` + `"type": "module"`) |
| `project-stats` retournait HTML après Application Insights | Setting `APPLICATIONINSIGHTS_CONNECTION_STRING` déstabilisant | Suppression du setting, redéploiement |
