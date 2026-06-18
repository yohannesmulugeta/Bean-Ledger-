# Phase 9 Demo Reporting Workflow

Phase 9 keeps the existing interface and replaces the reporting data source for migrated demo modules.

## Demo Login

- Username: `admin`
- Password: `password`

This remains demo-only local session handling. It is not production-grade authentication.

## Pages Connected

- Dashboard
- Reports
- Stock Report
- Purchase Orders Report
- Warehouse Receipt Report
- Activity Log
- Data Audit
- Shared Archived Records sections for migrated modules

## Service Layer

- `src/services/reportService.js` returns Base44-compatible arrays for existing report components.
- `src/services/dashboardService.js` exposes dashboard summary data.
- `src/services/auditService.js` exposes demo audit log rows.
- `src/services/archiveService.js` lists and restores archived rows for migrated modules.

## Workflow

1. Log in with the demo credentials.
2. Review dashboard cards and supplier/export views.
3. Open Reports and inspect purchase, warehouse, supplier balance, payment, processing, output, and export contract tabs.
4. Open Stock Report and confirm supplier/coffee-type stock summaries.
5. Open Activity Log and confirm synthetic demo audit entries.
6. Open migrated module archive sections and confirm archived synthetic rows are listed.

## Safety Notes

Do not import real Base44 data into this demo. Do not use production Supabase credentials. Attachments, notifications, full auth, users, and offline sync remain out of Phase 9 scope.
