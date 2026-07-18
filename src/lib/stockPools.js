/**
 * Stock pool helpers — keeps Fresh (Pool 1) and Recleaned (Pool 2) inventories separate.
 *
 * Pool 1 (Fresh):
 *   + Sum of OutputReport.export_kg where entry_type !== 'Recleaned'
 *   − Sum of BuyerInspection.sample_kg_taken (per coffee type, deducted from total pool)
 *   − Sum of SampleLog.sample_kg where sample_type === 'Export Inspection' (per coffee type)
 *   − Sum of ExportContract.export_kg where stock_pool !== 'Recleaned'
 *   − Sum of OutputReport.additional_pool1_kg where entry_type === 'Recleaned' (fresh stock used to supplement recleaning)
 *
 * Pool 2 (Recleaned):
 *   + Sum of OutputReport.export_kg where entry_type === 'Recleaned'
 *   − Sum of ExportContract.export_kg where stock_pool === 'Recleaned'
 */

export function computeStockPools({ outputReports = [], contracts = [], inspections = [], sampleLogs = [], adjustments = [] }) {
  const freshOutput = {};
  const recleanedOutput = {};
  const additionalPool1ByType = {}; // Pool 1 KG drawn into recleaning entries
  outputReports.filter(r => r?.archived !== true).forEach((r) => {
    const ct = r.coffee_type;
    if (!ct) return;
    if (r.entry_type === 'Recleaned') {
      recleanedOutput[ct] = (recleanedOutput[ct] || 0) + (r.export_kg || 0);
      if (r.additional_pool1_kg > 0) {
        additionalPool1ByType[ct] = (additionalPool1ByType[ct] || 0) + (r.additional_pool1_kg || 0);
      }
    } else {
      freshOutput[ct] = (freshOutput[ct] || 0) + (r.export_kg || 0);
    }
  });

  const inspectionSamples = {};
  inspections.filter(i => i?.archived !== true).forEach((i) => {
    const ct = i.coffee_type;
    if (!ct) return;
    inspectionSamples[ct] = (inspectionSamples[ct] || 0) + (i.sample_kg_taken || 0);
  });

  const exportInspectionSamples = {};
  sampleLogs.filter(s => s?.archived !== true).forEach((s) => {
    if (s.sample_type !== 'Export Inspection') return;
    const ct = s.coffee_type;
    if (!ct) return;
    exportInspectionSamples[ct] = (exportInspectionSamples[ct] || 0) + (s.sample_kg || 0);
  });

  const freshContracted = {};
  const recleanedContracted = {};
  contracts.filter(c => c?.archived !== true).forEach((c) => {
    const ct = c.coffee_type || c.commodity;
    if (!ct) return;
    if (c.stock_pool === 'Recleaned') {
      recleanedContracted[ct] = (recleanedContracted[ct] || 0) + (c.export_kg || 0);
    } else {
      freshContracted[ct] = (freshContracted[ct] || 0) + (c.export_kg || 0);
    }
  });

  const freshAdjustments = {};
  const recleanedAdjustments = {};
  adjustments.filter(a => a?.archived !== true && !a?.archived_at && a.status === 'approved').forEach((adjustment) => {
    const ct = adjustment.coffee_type;
    if (!ct) return;
    if (adjustment.target_type === 'Fresh') freshAdjustments[ct] = (freshAdjustments[ct] || 0) + Number(adjustment.quantity_kg || 0);
    if (adjustment.target_type === 'Recleaned') recleanedAdjustments[ct] = (recleanedAdjustments[ct] || 0) + Number(adjustment.quantity_kg || 0);
  });

  const allTypes = new Set([
    ...Object.keys(freshOutput),
    ...Object.keys(recleanedOutput),
    ...Object.keys(additionalPool1ByType),
    ...Object.keys(inspectionSamples),
    ...Object.keys(exportInspectionSamples),
    ...Object.keys(freshContracted),
    ...Object.keys(recleanedContracted),
    ...Object.keys(freshAdjustments),
    ...Object.keys(recleanedAdjustments),
  ]);

  const fresh = {};
  const recleaned = {};
  const breakdown = {};
  allTypes.forEach((ct) => {
    const fOutput = freshOutput[ct] || 0;
    const fInspSample = inspectionSamples[ct] || 0;
    const fExpInspSample = exportInspectionSamples[ct] || 0;
    const fExported = freshContracted[ct] || 0;
    const fPool1UsedInRecleaning = additionalPool1ByType[ct] || 0;
    const fAdjustment = freshAdjustments[ct] || 0;
    const freshAvail = Math.max(0, fOutput - fInspSample - fExpInspSample - fExported - fPool1UsedInRecleaning + fAdjustment);

    const rOutput = recleanedOutput[ct] || 0;
    const rExported = recleanedContracted[ct] || 0;
    const rAdjustment = recleanedAdjustments[ct] || 0;
    const recleanedAvail = Math.max(0, rOutput - rExported + rAdjustment);

    fresh[ct] = freshAvail;
    recleaned[ct] = recleanedAvail;
    breakdown[ct] = {
      freshOutput: fOutput,
      inspectionSamples: fInspSample,
      exportInspectionSamples: fExpInspSample,
      freshExported: fExported,
      pool1UsedInRecleaning: fPool1UsedInRecleaning,
      freshAdjustment: fAdjustment,
      freshAvail,
      recleanedOutput: rOutput,
      recleanedExported: rExported,
      recleanedAdjustment: rAdjustment,
      recleanedAvail,
    };
  });

  return { fresh, recleaned, breakdown };
}
