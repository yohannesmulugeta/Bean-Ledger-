# BeanLedger Demo Client Testing Guide

## 1. Welcome

BeanLedger is a coffee export operations and ledger management system.

This demo helps your team test the main workflows before the system is used with real company data. Please use it to review the screens, try the workflows, and tell us what should be fixed or improved.

## 2. Important Demo Notice

This is a demo environment.

- The data shown in the system is sample data.
- The login is demo-only and is not production security.
- Please do not treat this demo as the live production system.
- Please test the workflows and share feedback.

## 3. How to Open the Demo

Live app:

https://bean-ledger.vercel.app/

Demo login:

```text
Username: admin
Password: password
```

## 4. Login

1. Open the live app link.
2. Enter the demo username.
3. Enter the demo password.
4. Click **Sign in**.

![Login screen](../../screenshots/site-pages-loaded-2026-06-20T14-07-06-200Z/00-login.png)

## 5. Dashboard Overview

After login, the dashboard gives a quick overview of the coffee export operation.

Use the dashboard to review:

- Purchase and supplier information
- Warehouse and stock information
- Export activity
- Reports and totals

![Dashboard](../../screenshots/site-pages-loaded-2026-06-20T14-07-06-200Z/01-dashboard.png)

## 6. Supplier / Master Data

Use **Master Data** to review or add supplier information.

Client test:

1. Open **Master Data**.
2. Check the supplier table.
3. Click **Add Supplier** if you want to test creating a sample supplier.
4. Confirm the fields are understandable.

![Master Data](../../screenshots/site-pages-loaded-2026-06-20T14-07-06-200Z/02-master-data.png)

## 7. Purchase Workflow

Use **Purchase Registration** to record coffee purchases.

Client test:

1. Open **Purchase Registration**.
2. Click **New Purchase**.
3. Enter sample purchase information.
4. Save the record.
5. Check if totals, payment status, and balance are clear.

![Purchase Registration](../../screenshots/site-pages-loaded-2026-06-20T14-07-06-200Z/03-purchase-registration.png)

## 8. Warehouse Workflow

Use **Warehouse Receipt** to record coffee received into the warehouse.

Client test:

1. Open **Warehouse Receipt**.
2. Click **New Receipt**.
3. Enter sample receipt details.
4. Check if received KG and available KG are understandable.
5. Confirm archived records are easy to find.

![Warehouse Receipt](../../screenshots/site-pages-loaded-2026-06-20T14-07-06-200Z/04-warehouse-receipt.png)

## 9. Sample Log

Use **Sample Log** to track coffee samples taken from warehouse stock.

Client test:

1. Open **Sample Log**.
2. Click **New Entry**.
3. Record a sample KG amount.
4. Check if available KG is clear after sample usage.

![Sample Log](../../screenshots/site-pages-loaded-2026-06-20T14-07-06-200Z/05-sample-log.png)

## 10. Processing Workflow

Use **Processing Log** to record coffee sent for processing.

Client test:

1. Open **Processing Log**.
2. Click **New Entry**.
3. Enter a sample processing dispatch.
4. Use filters to search by date or supplier.

![Processing Log](../../screenshots/site-pages-loaded-2026-06-20T14-07-06-200Z/06-processing-log.png)

## 11. Output Report

Use **Output Report** to record processing output by supplier and coffee type.

Client test:

1. Open **Output Report**.
2. Click **New Report**.
3. Enter sample output data.
4. Try **Export PDF** or **Export Excel**.

![Output Report](../../screenshots/site-pages-loaded-2026-06-20T14-07-06-200Z/07-output-report.png)

## 12. Export Contract Workflow

Use **Export Contracts** to review export contracts and profitability.

Client test:

1. Open **Export Contracts**.
2. Click **New Contract**.
3. Enter a sample contract.
4. Check if contract number, destination, KG, price, and status are clear.
5. Try **Export Excel**.

![Export Contracts](../../screenshots/site-pages-loaded-2026-06-20T14-07-06-200Z/10-export-contracts.png)

## 13. Materials and Bag Ledger

Use **Materials Register** to track packaging and other purchase materials.

Use **Bag Ledger** to review bag receipts, returns, reject usage, and settlements.

Client test:

1. Open **Materials Register**.
2. Review export materials and general purchase tabs.
3. Open **Bag Ledger**.
4. Check bag return and cash settlement summaries.

![Materials Register](../../screenshots/site-pages-loaded-2026-06-20T14-07-06-200Z/11-materials-register.png)

![Bag Ledger](../../screenshots/site-pages-loaded-2026-06-20T14-07-06-200Z/12-bag-ledger.png)

## 14. Reports

Use **Reports** and **Stock Report** to review totals and stock information.

Client test:

1. Open **Reports**.
2. Select report types such as purchase summary, warehouse stock, supplier balance, payments, processing, and export contracts.
3. Open **Stock Report**.
4. Use filters for supplier, coffee type, and zero stock.
5. Try exporting reports.

![Reports](../../screenshots/site-pages-loaded-2026-06-20T14-07-06-200Z/08-reports.png)

![Stock Report](../../screenshots/site-pages-loaded-2026-06-20T14-07-06-200Z/13-stock-report.png)

## 15. Other Pages to Review

You can also review:

- **Buyer Inspections**: buyer inspection records and pass/fail results
- **Notifications**: demo notification inbox and settings
- **Permissions**: read-only role and permission overview
- **Activity Log**: history of user actions
- **User Report**: staff activity report
- **Data Audit**: checks for data quality issues

These pages help the team review control, tracking, and reporting needs.

## 16. Client Testing Checklist

Please test the demo and answer these questions:

1. Does login work?
2. Can you add or review a supplier?
3. Can you add a sample purchase?
4. Can you move stock through warehouse and processing?
5. Can you record output after processing?
6. Can you create or review an export contract?
7. Are the reports easy to understand?
8. Does the system work on a mobile phone?
9. What is confusing?
10. What is missing?
11. What information is incorrect?

## 17. How Feedback Will Be Handled

After client testing, feedback will be grouped into:

- **Bug fixes**: something is broken or not working correctly
- **Small improvements**: wording, layout, filters, or small workflow changes
- **New feature requests**: larger additions for a future phase

Please send screenshots or notes when reporting an issue. This helps us understand exactly what happened.
