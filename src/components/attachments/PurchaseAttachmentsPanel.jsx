// @ts-nocheck
import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attachmentService } from '@/services/attachmentService';
import { AttachmentSlot, CompactAttachSlot } from './FileAttachments';
import { parsePayments } from '@/components/purchases/PaymentHistoryPanel';
import { FileText, Receipt, Warehouse } from 'lucide-react';

function SectionHeader({ icon: Icon, label, subtitle }) {
  return (
    <div className="flex items-start gap-2 mb-3">
      <div className="mt-0.5 h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">{label}</p>
        {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

export default function PurchaseAttachmentsPanel({ purchase }) {
  const qc = useQueryClient();
  const { data: attachments = [] } = useQuery({
    queryKey: ['attachments', 'purchase_record', purchase.id],
    queryFn: () => attachmentService.listForEntity('purchase_record', purchase.id),
    enabled: !!purchase.id,
  });

  const createMut = useMutation({
    mutationFn: ({ file, metadata }) => attachmentService.uploadForEntity('purchase_record', purchase.id, file, metadata),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attachments', 'purchase_record', purchase.id] }),
  });
  const deleteMut = useMutation({
    mutationFn: id => attachmentService.archiveAttachment(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attachments', 'purchase_record', purchase.id] }),
  });

  const handleAdd = (section, sectionRef) => (att) => {
    createMut.mutate({
      file: att.file,
      metadata: {
        ...att,
        section,
        section_ref: sectionRef || '',
        description: `Demo purchase document for ${purchase.coffee_code || purchase.id}`,
      },
    });
  };

  const handleDelete = (att) => deleteMut.mutate(att.id);

  const contractDocs = attachments.filter(a => a.section === 'contract_document');
  const grnDocs = attachments.filter(a => a.section === 'grn_certificate');
  const payments = parsePayments(purchase);

  return (
    <div className="space-y-6 py-2">
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
        Demo documents only. Do not upload real customer files in this migration phase.
      </div>
      {/* ── Section 1: Purchase Contract ─────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-4">
        <SectionHeader
          icon={FileText}
          label="Purchase Contract"
          subtitle="Upload the signed purchase contract for this lot"
        />
        <AttachmentSlot
          label=""
          emptyLabel="Upload signed contract"
          subtext="PDF, JPG, PNG · Max 10 MB"
          attachments={contractDocs}
          onAdd={handleAdd('contract_document', 'signed_contract')}
          onDelete={handleDelete}
        />
      </div>

      {/* ── Section 2: Payment Vouchers (CPV slips) ───────────────── */}
      <div className="rounded-xl border border-border bg-card p-4">
        <SectionHeader
          icon={Receipt}
          label="Payment Vouchers"
          subtitle="Attach the bank payment slip for each CPV reference number"
        />
        {payments.length === 0 ? (
          <div className="text-xs text-muted-foreground border border-dashed border-border rounded-lg py-4 text-center">
            No payment entries yet. Add payments in the Purchase Details tab first.
          </div>
        ) : (
          <div className="space-y-3">
            {payments.map((pay, i) => {
              const ref = pay.cpv_reference || `payment-${i + 1}`;
              const cpvLabel = pay.cpv_reference ? `CPV-${pay.cpv_reference}` : `Payment #${i + 1}`;
              const amount = parseFloat(pay.amount_etb) || 0;
              const slotAtts = attachments.filter(a => a.section === 'payment_voucher' && a.section_ref === ref);

              return (
                <div key={`${ref}-${i}`} className="border border-border rounded-lg p-3 bg-muted/20">
                  {/* Payment row header */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Receipt className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 flex-shrink-0">
                        {cpvLabel}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">
                        {pay.bank_name || '—'} · ETB {amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        {pay.payment_date ? ` · ${pay.payment_date}` : ''}
                      </span>
                    </div>
                  </div>

                  {/* Compact attach slot for this CPV */}
                  <CompactAttachSlot
                    attachments={slotAtts}
                    onAdd={handleAdd('payment_voucher', ref)}
                    onDelete={handleDelete}
                    cpvRef={ref}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Section 3: GRN Certificate ───────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-4">
        <SectionHeader
          icon={Warehouse}
          label="Warehouse Receipt (GRN)"
          subtitle="Attach the physical GRN certificate for this lot"
        />
        <AttachmentSlot
          label=""
          emptyLabel="Upload GRN certificate"
          subtext={`PDF, JPG, PNG · Max 10 MB · GRN code will be used as filename prefix`}
          attachments={grnDocs}
          onAdd={handleAdd('grn_certificate', purchase.coffee_code || 'grn')}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}
