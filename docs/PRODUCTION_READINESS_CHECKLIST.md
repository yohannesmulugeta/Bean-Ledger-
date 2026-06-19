# Production Readiness Checklist

This demo is not production-ready. Complete this checklist before any production launch or migration of real customer data.

## Data Migration

- [ ] Real Base44 exports received.
- [ ] Every Base44 entity exported with source IDs preserved.
- [ ] Truncation risks checked for 500, 1000, and 5000 record limits.
- [ ] Entity counts reconciled against Base44.
- [ ] Production migration dry run completed.
- [ ] Real data reconciliation report approved.
- [ ] No synthetic demo data mixed into production.

## Attachments

- [ ] Real attachment references exported.
- [ ] Real customer documents migrated.
- [ ] Storage bucket permissions reviewed.
- [ ] Attachment reconciliation completed.
- [ ] Upload/download flows tested with production-like files.

## Authentication and Permissions

- [ ] Supabase Auth implemented.
- [ ] Demo `admin` / `password` login removed.
- [ ] Role permissions finalized.
- [ ] Organization membership rules verified.
- [ ] RLS policies hardened and tested.
- [ ] Admin-only operations protected server-side.

## Database and Operations

- [ ] Production Supabase project confirmed.
- [ ] Production migrations reviewed.
- [ ] Backups configured and tested.
- [ ] Restore procedure documented.
- [ ] Monitoring configured.
- [ ] Error logging configured.
- [ ] Audit log retention reviewed.
- [ ] Archive/restore behavior reviewed.

## Security

- [ ] No service-role key in frontend.
- [ ] No database password in Vercel frontend env.
- [ ] No Base44 secrets in Vercel frontend env.
- [ ] No Telegram token in frontend env.
- [ ] Secrets rotated where previously exposed.
- [ ] Final security review completed.

## Product Validation

- [ ] Purchase workflow validated against real Base44 records.
- [ ] Warehouse workflow validated.
- [ ] Processing workflow validated.
- [ ] Export contract workflow validated.
- [ ] Bag/material workflow validated.
- [ ] Reports reconciled against Base44.
- [ ] Mobile smoke testing completed.
- [ ] Route refresh behavior verified.

## Deployment

- [ ] Vercel production environment variables configured safely.
- [ ] Production domain deployment approved.
- [ ] Preview/staging signoff completed.
- [ ] Rollback plan documented.
- [ ] Client acceptance testing completed.

