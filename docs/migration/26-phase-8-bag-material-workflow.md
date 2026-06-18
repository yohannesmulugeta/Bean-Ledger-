# Phase 8 Bag and Material Workflow

Date: 2026-06-18

## Bag Rules

Constants:

- reject bag cash value: `153 ETB`
- bag loss allowance: `1%`, rounded up

Balance:

```text
received = bag receipts + settlement received adjustments
loss allowance = ceil(received * 1%)
used = reject bag usages + settlement used adjustments
net to return = received - loss allowance - used
returned = supplier bag returns + settlement returned count
bags remaining = max(0, net to return - returned)
cash earned = used * 153
cash remaining = max(0, cash earned - payments)
```

Agent-mode rows are grouped by `agent_name`. Supplier-mode rows are grouped by `supplier_name`.

## Material Rules

Export materials use movement rows:

- `material_purchase` increases balance
- `material_usage` decreases balance
- archived entries archive their movements
- restored entries reapply their movements

Usage cannot exceed available balance.

General material purchases are stored in `material_register_entries` but do not create stock movement rows.

## Atomicity

Supabase write operations go through RPC functions. The RPC functions validate inputs, write operational records, update movement records where relevant, and write audit logs in one database transaction.

## Seed Reconciliation

After local reset, the synthetic demo seed produces:

- Agent `Demo Agent A`: `100` received, `1` loss, `12` used, `87` net to return, `30` returned, `57` remaining, `1836 ETB` cash earned, `1000 ETB` paid, `836 ETB` remaining
- Supplier `Demo Guji Washing Station`: `42` received after settlement adjustment, `1` loss, `41` remaining
- Material `Bag 60kg`: `80` purchased, `6` used, `74` balance

## Out of Scope

Phase 8 does not migrate notifications, attachments, full reports, full Supabase Auth, production data, offline sync, or final dashboard replacement.
