# Base44 Export Workspace

This folder is for local migration export work only.

- `manual-drop/` is ignored by Git. Put manually downloaded Base44 JSON exports there.
- `runs/` is ignored by Git. Generated normalized exports, id maps, attachment indexes, and reconciliation reports go there.
- Do not commit customer exports, documents, tokens, database dumps, or production credentials.

Recommended local flow:

```powershell
npm run migration:base44:prepare
# Put Base44 JSON files in exports/base44/manual-drop/
npm run migration:base44:package
npm run migration:base44:reconcile
```
