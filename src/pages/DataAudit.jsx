import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportService } from '@/services/reportService';
import { useRole } from '@/lib/role-hooks';
import runDataAudit from '@/lib/dataAudit';
import AccessDenied from '@/components/AccessDenied';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import {
  Search, Play, FileSpreadsheet, FileText, ExternalLink, Copy, ChevronDown, ChevronUp, CheckCircle2,
  XCircle, AlertTriangle, Info, Eye, EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

const SEV_STYLE = {
  critical: { badge: 'bg-red-100 text-red-700 border-red-200', icon: XCircle, iconColor: 'text-red-500', label: 'Critical', dot: 'text-red-500' },
  warning: { badge: 'bg-amber-100 text-amber-700 border-amber-200', icon: AlertTriangle, iconColor: 'text-amber-500', label: 'Warning', dot: 'text-amber-500' },
  info: { badge: 'bg-blue-100 text-blue-700 border-blue-200', icon: Info, iconColor: 'text-blue-500', label: 'Info', dot: 'text-blue-500' },
};

function useAuditData() {
  const audit = useQuery({ queryKey: ['phase9-data-audit-snapshot'], queryFn: () => reportService.dataAuditSnapshot(), staleTime: 0 });
  const data = audit.data || {};

  return {
    suppliers: data.suppliers || [],
    purchases: data.purchases || [],
    warehouseReceipts: data.warehouseReceipts || [],
    sampleLogs: data.sampleLogs || [],
    processingLogs: data.processingLogs || [],
    outputReports: data.outputReports || [],
    exportContracts: data.exportContracts || [],
    buyerInspections: data.buyerInspections || [],
    bagReceipts: data.bagReceipts || [],
    rejectBagUsages: data.rejectBagUsages || [],
    supplierBagPayments: data.supplierBagPayments || [],
    supplierBagReturns: data.supplierBagReturns || [],
    materialEntries: data.materialEntries || [],
    isLoading: audit.isLoading,
    isError: audit.isError,
  };
}

// ── Copy Issue Helper ──────────────────────────────────────────────────────────
function buildIssueText(issue) {
  const lines = [
    `**${issue.problem_title}**`,
    `Severity: ${issue.severity?.toUpperCase()}  |  Category: ${issue.category}  |  Module: ${issue.module}`,
    ``,
    `**What is wrong:**`,
    issue.problem_description,
    ``,
  ];
  if (issue.expected_value) lines.push(`**Expected:** ${issue.expected_value}`);
  if (issue.actual_value) lines.push(`**Actual:** ${issue.actual_value}`);
  if (issue.difference) lines.push(`**Difference:** ${issue.difference}`);
  if (issue.supplier_name) lines.push(`**Supplier:** ${issue.supplier_name}`);
  if (issue.coffee_code) lines.push(`**Coffee Code:** ${issue.coffee_code}`);
  if (issue.buyer_name) lines.push(`**Buyer:** ${issue.buyer_name}`);
  lines.push(`**Record:** ${issue.record_label}`);
  lines.push(`**Record ID:** ${issue.record_id}`);
  lines.push(``);
  lines.push(`**Suggested Fix:**`);
  lines.push(issue.suggested_fix);
  return lines.join('\n');
}

// ── Expandable Details ─────────────────────────────────────────────────────────
function IssueDetails({ issue }) {
  return (
    <div className="p-4 bg-muted/30 border-t border-border space-y-4 text-sm">
      {/* Problem */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">What is wrong</p>
        <p className="text-sm text-foreground">{issue.problem_description}</p>
      </div>

      {/* Values */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {issue.expected_value && (
          <div className="bg-white border border-border rounded-lg p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">Expected</p>
            <p className="font-mono text-sm font-bold text-emerald-700">{issue.expected_value}</p>
          </div>
        )}
        {issue.actual_value && (
          <div className="bg-white border border-border rounded-lg p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">Actual</p>
            <p className="font-mono text-sm font-bold text-red-700">{issue.actual_value}</p>
          </div>
        )}
        {issue.difference && (
          <div className="bg-white border border-border rounded-lg p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">Difference</p>
            <p className="font-mono text-sm font-bold text-amber-700">{issue.difference}</p>
          </div>
        )}
      </div>

      {/* Related info */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {issue.supplier_name && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Supplier</p>
            <p className="text-sm">{issue.supplier_name}</p>
          </div>
        )}
        {issue.coffee_code && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Coffee Code</p>
            <p className="text-sm font-mono">{issue.coffee_code}</p>
          </div>
        )}
        {issue.buyer_name && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Buyer</p>
            <p className="text-sm">{issue.buyer_name}</p>
          </div>
        )}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Record ID</p>
          <p className="text-sm font-mono text-muted-foreground">{issue.record_id}</p>
        </div>
      </div>

      {/* Suggested fix */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Suggested fix</p>
        <p className="text-sm text-foreground bg-white border border-border rounded-lg p-3">{issue.suggested_fix}</p>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function DataAuditPage() {
  const { role } = useRole();
  const allowedRoles = ['admin', 'supervisor', 'auditor'];
  if (!allowedRoles.includes(role)) return <AccessDenied message="Only admin, supervisor, and auditor roles can access Data Audit." />;
  return <DataAuditContent />;
}

function DataAuditContent() {
  const [auditRun, setAuditRun] = useState(false);
  const [issues, setIssues] = useState([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);
  const [checkCount, setCheckCount] = useState(40);
  const [severityFilter, setSeverityFilter] = useState('critical_warning');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [coffeeCodeFilter, setCoffeeCodeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState({});
  const [sort, setSort] = useState('critical');
  const [showInfo, setShowInfo] = useState(false);

  const auditData = useAuditData();
  const allLoaded = useMemo(() => !auditData.isLoading, [auditData.isLoading]);

  const runAudit = async () => {
    setRunning(true);
    setError(null);
    try {
      await new Promise(r => setTimeout(r, 300));
      const result = runDataAudit(auditData);
      setIssues(result);
      setAuditRun(true);
      setExpanded({});
      setCheckCount(result._checkCount || 40);
      toast.success(`Audit complete — ${result.filter(i => i.severity === 'critical').length} critical, ${result.filter(i => i.severity === 'warning').length} warnings, ${result.filter(i => i.severity === 'info').length} info`);
    } catch (e) {
      setError(e.message || 'Audit failed');
      toast.error('Audit run failed');
    } finally {
      setRunning(false);
    }
  };

  // Module / category / supplier / coffee code lists
  const modules = useMemo(() => [...new Set(issues.map(i => i.module))].sort(), [issues]);
  const categories = useMemo(() => [...new Set(issues.map(i => i.category))].sort(), [issues]);
  const allSuppliers = useMemo(() => [...new Set(issues.map(i => i.supplier_name).filter(Boolean))].sort(), [issues]);
  const allCoffeeCodes = useMemo(() => [...new Set(issues.map(i => i.coffee_code).filter(Boolean))].sort(), [issues]);

  const filtered = useMemo(() => {
    let list = [...issues];
    if (severityFilter === 'critical_warning') {
      list = list.filter(i => i.severity === 'critical' || i.severity === 'warning');
    } else if (severityFilter !== 'all') {
      list = list.filter(i => i.severity === severityFilter);
    }
    // Info toggle: when showInfo is false, hide all info issues regardless of severityFilter
    if (!showInfo) list = list.filter(i => i.severity !== 'info');
    if (moduleFilter !== 'all') list = list.filter(i => i.module === moduleFilter);
    if (categoryFilter !== 'all') list = list.filter(i => i.category === categoryFilter);
    if (supplierFilter) list = list.filter(i => (i.supplier_name || '').toLowerCase().includes(supplierFilter.toLowerCase()));
    if (coffeeCodeFilter) list = list.filter(i => (i.coffee_code || '').toLowerCase().includes(coffeeCodeFilter.toLowerCase()));
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(i =>
        (i.problem_title || '').toLowerCase().includes(s) ||
        (i.problem_description || '').toLowerCase().includes(s) ||
        (i.record_label || '').toLowerCase().includes(s) ||
        (i.record_id || '').toLowerCase().includes(s) ||
        (i.supplier_name || '').toLowerCase().includes(s),
      );
    }
    // Sort: critical first, then by largest difference
    const sevOrder = { critical: 0, warning: 1, info: 2 };
    list.sort((a, b) => {
      if (sort === 'critical') {
        const sa = sevOrder[a.severity] ?? 9;
        const sb = sevOrder[b.severity] ?? 9;
        if (sa !== sb) return sa - sb;
      }
      const da = parseFloat(a.difference) || 0;
      const db = parseFloat(b.difference) || 0;
      if (sort === 'largest') return db - da;
      return da - db;
    });
    return list;
  }, [issues, severityFilter, moduleFilter, categoryFilter, supplierFilter, coffeeCodeFilter, search, sort]);

  const toggleExpand = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  const copyIssue = (issue) => {
    navigator.clipboard.writeText(buildIssueText(issue)).then(
      () => toast.success('Issue copied to clipboard'),
      () => toast.error('Failed to copy'),
    );
  };

  const criticalCount = issues.filter(i => i.severity === 'critical').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;
  const infoCount = issues.filter(i => i.severity === 'info').length;
  const filteredCritical = filtered.filter(i => i.severity === 'critical').length;
  const filteredWarning = filtered.filter(i => i.severity === 'warning').length;
  const filteredInfo = filtered.filter(i => i.severity === 'info').length;
  const hiddenInfoCount = infoCount - filteredInfo;

  const exportExcel = () => {
    import('xlsx').then(XLSX => {
      const headers = ['Severity', 'Category', 'Module', 'Record ID', 'Problem Title', 'Problem Description', 'Record', 'Supplier', 'Coffee Code', 'Buyer', 'Expected', 'Actual', 'Difference', 'Suggested Fix'];
      const rows = filtered.map(i => [i.severity, i.category, i.module, i.record_id || '', i.problem_title, i.problem_description, i.record_label, i.supplier_name || '', i.coffee_code || '', i.buyer_name || '', i.expected_value || '', i.actual_value || '', i.difference || '', i.suggested_fix || '']);
      const aoa = [['BeanLedger Data Audit Report'], [`Generated: ${new Date().toLocaleDateString()}`], [], headers, ...rows];
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      ws['!cols'] = headers.map((h, ci) => ({ wch: Math.min(Math.max(String(h).length + 2, 15), 50) }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Audit Issues');
      XLSX.writeFile(wb, `BeanLedger-Data-Audit-${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Audit exported to Excel');
    });
  };

  const exportPDF = () => {
    import('jspdf').then(({ default: jsPDF }) => {
      const doc = new jsPDF({ orientation: 'landscape' });
      const pgW = doc.internal.pageSize.getWidth();
      const margin = 10;
      let y = 10;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(31, 42, 36);
      doc.text('BeanLedger Data Audit Report', margin, y); y += 8;
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(`Generated: ${new Date().toLocaleDateString()}  |  ${filtered.length} issues`, margin, y); y += 6;

      const headers = ['Sev', 'Category', 'Module', 'Record ID', 'Record', 'Problem', 'Expected', 'Actual', 'Diff', 'Fix'];
      const colW = [(pgW - margin * 2) * 0.05, (pgW - margin * 2) * 0.09, (pgW - margin * 2) * 0.12, (pgW - margin * 2) * 0.11, (pgW - margin * 2) * 0.10, (pgW - margin * 2) * 0.15, (pgW - margin * 2) * 0.08, (pgW - margin * 2) * 0.08, (pgW - margin * 2) * 0.06, (pgW - margin * 2) * 0.16];

      doc.setFillColor(31, 42, 36);
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      doc.rect(margin, y, pgW - margin * 2, 7, 'F');
      headers.forEach((h, i) => {
        let x = margin + colW.slice(0, i).reduce((a, b) => a + b, 0);
        doc.text(h, x + 1, y + 5);
      });
      y += 8;

      filtered.forEach((issue, idx) => {
        if (y > 180) { doc.addPage(); y = 10; }
        const shade = idx % 2 === 0 ? [255, 255, 255] : [240, 247, 240];
        doc.setFillColor(shade[0], shade[1], shade[2]);
        doc.rect(margin, y - 1, pgW - margin * 2, 6, 'F');
        const sevColor = issue.severity === 'critical' ? [200, 30, 30] : issue.severity === 'warning' ? [180, 120, 0] : [50, 100, 200];
        doc.setTextColor(sevColor[0], sevColor[1], sevColor[2]);
        doc.setFontSize(5.5);
        doc.setFont('helvetica', 'bold');
        const row = [
          (issue.severity || '').substring(0, 3).toUpperCase(),
          issue.category || '',
          issue.module || '',
          (issue.record_id || '').substring(0, 24),
          (issue.record_label || '').substring(0, 25),
          (issue.problem_title || '').substring(0, 30),
          issue.expected_value || '—',
          issue.actual_value || '—',
          issue.difference || '—',
          (issue.suggested_fix || '').substring(0, 25),
        ];
        row.forEach((cell, i) => {
          let x = margin + colW.slice(0, i).reduce((a, b) => a + b, 0);
          doc.setFontSize(5.5);
          if (i >= 5) doc.setFont('helvetica', 'normal');
          doc.text(String(cell), x + 1, y + 3.5);
        });
        y += 6;
      });

      doc.save(`BeanLedger-Data-Audit-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('Audit exported to PDF');
    });
  };

  if (!allLoaded) {
    return (
      <div className="space-y-4">
        <PageHeader title="Data Audit" description="Check ERP records for stock, finance, workflow, and data quality problems." />
        <div className="space-y-3">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Data Audit" description="Check ERP records for stock, finance, workflow, and data quality problems.">
        <Button onClick={runAudit} disabled={running} className="h-10 gap-2">
          <Play className="w-4 h-4" /> {running ? 'Running Audit...' : 'Run Audit'}
        </Button>
      </PageHeader>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3 text-sm text-destructive">Audit failed: {error}</div>
      )}

      {auditRun && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card><CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{filtered.length}{hiddenInfoCount > 0 ? <span className="text-xs text-muted-foreground ml-1 font-normal">+{hiddenInfoCount}</span> : ''}</p>
              <p className="text-xs text-muted-foreground">{showInfo ? 'Total Issues' : 'Active Issues'}{hiddenInfoCount > 0 ? ' (info hidden)' : ''}</p>
            </CardContent></Card>
            <Card className="border-red-200"><CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{criticalCount}</p>
              <p className="text-xs text-muted-foreground">Critical</p>
            </CardContent></Card>
            <Card className="border-amber-200"><CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-amber-600">{warningCount}</p>
              <p className="text-xs text-muted-foreground">Warnings</p>
            </CardContent></Card>
            <Card className={`${showInfo ? 'border-blue-200' : 'border-border opacity-60'}`}><CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{infoCount}</p>
              <p className="text-xs text-muted-foreground">Info{!showInfo && hiddenInfoCount > 0 ? ` (${hiddenInfoCount} hidden)` : ''}</p>
            </CardContent></Card>
            <Card className="border-emerald-200"><CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-emerald-600">{checkCount}</p>
              <p className="text-xs text-muted-foreground">Checks Run</p>
            </CardContent></Card>
          </div>

          {/* Show info toggle — only visible when info issues exist */}
          {infoCount > 0 && (
            <div className="flex items-center gap-2">
              <Button
                variant={showInfo ? 'default' : 'outline'}
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() => setShowInfo(!showInfo)}
              >
                {showInfo ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {showInfo ? 'Hide info suggestions' : `Show ${infoCount} info suggestions`}
              </Button>
              {!showInfo && <span className="text-xs text-muted-foreground">Info suggestions are hidden — they are cleanup ideas, not real problems.</span>}
            </div>
          )}

          {issues.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 border border-border rounded-xl bg-card">
              <div className="bg-emerald-50 rounded-full p-4 mb-4"><CheckCircle2 className="w-10 h-10 text-emerald-600" /></div>
              <h3 className="text-lg font-semibold text-foreground mb-1">No issues found</h3>
              <p className="text-sm text-muted-foreground">Your data passed all {checkCount} audit checks.</p>
            </div>
          )}

          {issues.length > 0 && (
            <div className="space-y-4">
              {/* ── Filter bar ── */}
              <div className="flex flex-wrap gap-2 items-center">
                <div className="relative flex-1 min-w-[180px] max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search issues..." className="pl-9 h-9" />
                </div>
                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger className="w-32 h-9"><SelectValue placeholder="Severity" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Severities</SelectItem>
                    <SelectItem value="critical_warning">Critical + Warning</SelectItem>
                    <SelectItem value="critical">Critical Only</SelectItem>
                    <SelectItem value="warning">Warning Only</SelectItem>
                    <SelectItem value="info">Info Only</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={moduleFilter} onValueChange={setModuleFilter}>
                  <SelectTrigger className="w-40 h-9"><SelectValue placeholder="Module" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Modules</SelectItem>
                    {modules.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-28 h-9"><SelectValue placeholder="Category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
                {allSuppliers.length > 0 && (
                  <Select value={supplierFilter || '__all__'} onValueChange={(v) => setSupplierFilter(v === '__all__' ? '' : v)}>
                    <SelectTrigger className="w-36 h-9"><SelectValue placeholder="Supplier" /></SelectTrigger>
                    <SelectContent className="max-w-sm">
                      <SelectItem value="__all__">All</SelectItem>
                      {allSuppliers.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
                {allCoffeeCodes.length > 0 && (
                  <Select value={coffeeCodeFilter || '__all__'} onValueChange={(v) => setCoffeeCodeFilter(v === '__all__' ? '' : v)}>
                    <SelectTrigger className="w-36 h-9"><SelectValue placeholder="Coffee Code" /></SelectTrigger>
                    <SelectContent className="max-w-sm">
                      <SelectItem value="__all__">All</SelectItem>
                      {allCoffeeCodes.map(c => <SelectItem key={c} value={c} className="font-mono text-xs">{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
                <Select value={sort} onValueChange={setSort}>
                  <SelectTrigger className="w-32 h-9"><SelectValue placeholder="Sort" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical first</SelectItem>
                    <SelectItem value="largest">Largest diff</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex-1" />
                <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={exportExcel}>
                  <FileSpreadsheet className="w-3.5 h-3.5" /> XLSX
                </Button>
                <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={exportPDF}>
                  <FileText className="w-3.5 h-3.5" /> PDF
                </Button>
              </div>

              {/* Shown/filtered counts */}
              {filtered.length !== issues.length && (
                <p className="text-xs text-muted-foreground">
                  Showing {filtered.length} of {issues.length} issues
                </p>
              )}

              {/* ── Issue table ── */}
              <div className="rounded-xl border border-border bg-card overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left px-3 py-2.5 text-xs font-semibold uppercase text-muted-foreground w-[75px]">Severity</th>
                      <th className="text-left px-3 py-2.5 text-xs font-semibold uppercase text-muted-foreground w-[85px]">Category</th>
                      <th className="text-left px-3 py-2.5 text-xs font-semibold uppercase text-muted-foreground w-[140px]">Module</th>
                      <th className="text-left px-3 py-2.5 text-xs font-semibold uppercase text-muted-foreground">Record</th>
                      <th className="text-left px-3 py-2.5 text-xs font-semibold uppercase text-muted-foreground">Problem</th>
                      <th className="text-left px-3 py-2.5 text-xs font-semibold uppercase text-muted-foreground hidden md:table-cell w-[95px]">Expected</th>
                      <th className="text-left px-3 py-2.5 text-xs font-semibold uppercase text-muted-foreground hidden md:table-cell w-[95px]">Actual</th>
                      <th className="text-left px-3 py-2.5 text-xs font-semibold uppercase text-muted-foreground hidden md:table-cell w-[80px]">Diff</th>
                      <th className="text-left px-3 py-2.5 text-xs font-semibold uppercase text-muted-foreground">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((issue, idx) => {
                      const st = SEV_STYLE[issue.severity] || SEV_STYLE.info;
                      const Icon = st.icon;
                      const isExpanded = expanded[issue.id] || false;

                      return (
                        <React.Fragment key={issue.id}>
                          <tr className={`border-b border-border hover:bg-muted/30 ${idx % 2 === 0 ? '' : 'bg-muted/10'}`}>
                            <td className="px-3 py-2.5">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${st.badge}`}>
                                <Icon className={`w-3 h-3 ${st.iconColor}`} /> {st.label}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-xs">{issue.category}</td>
                            <td className="px-3 py-2.5 text-xs font-medium">{issue.module}</td>
                            <td className="px-3 py-2.5 text-xs max-w-[180px] truncate" title={issue.record_label}>
                              {issue.supplier_name && <span className="text-muted-foreground">{issue.supplier_name} · </span>}
                              {issue.record_label}
                            </td>
                            <td className="px-3 py-2.5 text-xs max-w-[200px] truncate" title={issue.problem_title}>{issue.problem_title}</td>
                            <td className="px-3 py-2.5 text-xs font-mono text-emerald-700 hidden md:table-cell">{issue.expected_value || '—'}</td>
                            <td className="px-3 py-2.5 text-xs font-mono text-red-700 hidden md:table-cell">{issue.actual_value || '—'}</td>
                            <td className="px-3 py-2.5 text-xs font-mono text-amber-700 hidden md:table-cell">{issue.difference || '—'}</td>
                            <td className="px-3 py-1.5">
                              <div className="flex items-center gap-1">
                                {issue.target_route && issue.target_record_id && (
                                  <Link
                                    to={`${issue.target_route}?auditRecordId=${issue.target_record_id}&auditIssueTitle=${encodeURIComponent(issue.problem_title)}`}
                                    title="View Problem"
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 text-[11px] font-medium no-underline transition-colors"
                                  >
                                    <ExternalLink className="w-3 h-3" /> View
                                  </Link>
                                )}
                                <button
                                  onClick={() => copyIssue(issue)}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted hover:bg-muted/80 text-[11px] font-medium text-muted-foreground transition-colors"
                                  title="Copy Issue Summary"
                                >
                                  <Copy className="w-3 h-3" /> Copy
                                </button>
                                <button
                                  onClick={() => toggleExpand(issue.id)}
                                  className="inline-flex items-center gap-0.5 px-2 py-1 rounded-md bg-muted/50 hover:bg-muted text-[11px] font-medium text-muted-foreground transition-colors"
                                  title={isExpanded ? 'Collapse details' : 'Expand details'}
                                >
                                  {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                  Details
                                </button>
                              </div>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className="border-b border-border">
                              <td colSpan={9} className="p-0">
                                <IssueDetails issue={issue} />
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
