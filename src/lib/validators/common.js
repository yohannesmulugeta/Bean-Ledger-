// Shared validation helpers for BeanLedger Coffee ERP
// Each helper returns { field, severity, message, expected_value, actual_value } or null

const MONEY_TOLERANCE = 0.05;
const KG_TOLERANCE = 0.1;
const BAG_TOLERANCE = 0.01;

export const TOLERANCE = { money: MONEY_TOLERANCE, kg: KG_TOLERANCE };

function fmt(n, d = 2) {
  if (n == null || isNaN(n)) return '—';
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
}

// ── Field-level helpers ──────────────────────────────────────────────────────

export function required(value, field, label) {
  if (value == null || (typeof value === 'string' && value.trim() === '') || value === '') {
    return { field, severity: 'error', message: `${label || field} is required.`, expected_value: 'Not empty', actual_value: 'Empty' };
  }
  return null;
}

export function positiveNumber(value, field, label) {
  const n = parseFloat(value);
  if (value == null || value === '' || isNaN(n)) return null; // skip if empty — use required() separately
  if (n <= 0) {
    return { field, severity: 'error', message: `${label || field} must be greater than zero.`, expected_value: '> 0', actual_value: fmt(n) };
  }
  return null;
}

export function nonNegativeNumber(value, field, label) {
  const n = parseFloat(value);
  if (value == null || value === '' || isNaN(n)) return null;
  if (n < 0) {
    return { field, severity: 'error', message: `${label || field} must not be negative.`, expected_value: '≥ 0', actual_value: fmt(n) };
  }
  return null;
}

export function nonNegative(value, field, label) {
  return nonNegativeNumber(value, field, label);
}

export function dateNotFuture(dateStr, field, label) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const now = new Date();
  now.setHours(23, 59, 59, 999); // end of today
  if (d > now) {
    return { field, severity: 'warning', message: `${label || field} is in the future (${dateStr}).`, expected_value: '≤ today', actual_value: dateStr };
  }
  return null;
}

export function toleranceCompare(expected, actual, field, label, tolerance = MONEY_TOLERANCE, expectedLabel, actualLabel) {
  if (expected == null || actual == null || isNaN(expected) || isNaN(actual)) return null;
  if (Math.abs(expected - actual) > tolerance) {
    return {
      field,
      severity: 'warning',
      message: `${label || field} mismatch. Expected ${expectedLabel || fmt(expected)} but got ${actualLabel || fmt(actual)}.`,
      expected_value: fmt(expected),
      actual_value: fmt(actual),
    };
  }
  return null;
}

// ── Comparison helpers ───────────────────────────────────────────────────────

export function exceedsLimit(value, limit, field, label, severity = 'warning') {
  const v = parseFloat(value);
  const l = parseFloat(limit);
  if (isNaN(v) || isNaN(l) || l <= 0) return null;
  if (v > l) {
    return { field, severity, message: `${label || field} exceeds ${fmt(l)}.`, expected_value: `≤ ${fmt(l)}`, actual_value: fmt(v) };
  }
  return null;
}

export function suspiciousVariance(value, reference, field, label, thresholdPct = 20) {
  const v = parseFloat(value);
  const r = parseFloat(reference);
  if (isNaN(v) || isNaN(r) || r === 0) return null;
  const pct = Math.abs((v - r) / r) * 100;
  if (pct > thresholdPct) {
    return { field, severity: 'warning', message: `${label || field} varies from reference by ${pct.toFixed(1)}%.`, expected_value: `≈ ${fmt(r)} (±${thresholdPct}%)`, actual_value: fmt(v) };
  }
  return null;
}

export function zeroValue(value, field, label) {
  const n = parseFloat(value);
  if (!isNaN(n) && n === 0) {
    return { field, severity: 'warning', message: `${label || field} is zero. This may be intentional but please verify.`, expected_value: '> 0', actual_value: '0' };
  }
  return null;
}

export function highValue(value, threshold, field, label) {
  const v = parseFloat(value);
  if (isNaN(v) || isNaN(threshold)) return null;
  if (v > threshold) {
    return { field, severity: 'warning', message: `${label || field} (${fmt(v)}) is unusually high. Threshold: ${fmt(threshold)}.`, expected_value: `≤ ${fmt(threshold)}`, actual_value: fmt(v) };
  }
  return null;
}

export function lowValue(value, threshold, field, label) {
  const v = parseFloat(value);
  if (isNaN(v) || isNaN(threshold)) return null;
  if (v < threshold && v !== 0) {
    return { field, severity: 'warning', message: `${label || field} (${fmt(v)}) is unusually low.`, expected_value: `≥ ${fmt(threshold)}`, actual_value: fmt(v) };
  }
  return null;
}

// ── Bag-specific helpers ─────────────────────────────────────────────────────

export function bagsToKg(bags, multiplier) {
  return (parseFloat(bags) || 0) * multiplier;
}

export function checkBagCalc(bags, expectedKg, multiplier, field, bagLabel, kgLabel) {
  const b = parseFloat(bags) || 0;
  const ek = parseFloat(expectedKg);
  if (isNaN(ek)) return null;
  const calc = b * multiplier;
  if (Math.abs(calc - ek) > KG_TOLERANCE) {
    return {
      field,
      severity: 'error',
      message: `${kgLabel} mismatch. ${b} ${bagLabel} × ${multiplier} = ${fmt(calc)} KG, but stored value is ${fmt(ek)} KG.`,
      expected_value: fmt(calc),
      actual_value: fmt(ek),
    };
  }
  return null;
}

// ── Duplicate helpers ────────────────────────────────────────────────────────

export function duplicateCode(code, existingCodes, field, label) {
  if (!code || !existingCodes) return null;
  if (existingCodes.has(code)) {
    return { field, severity: 'error', message: `${label || field} "${code}" already exists. Must be unique.`, expected_value: 'Unique code', actual_value: code };
  }
  return null;
}

export function possibleDuplicate(matches, field, label) {
  if (!matches || matches.length === 0) return null;
  return {
    field,
    severity: 'warning',
    message: `${label || field}: possible duplicate found. ${matches.length} similar record(s) exist.`,
    expected_value: 'No match',
    actual_value: `${matches.length} similar records`,
  };
}

// ── Workflow link helpers ────────────────────────────────────────────────────

export function missingLink(value, source, field, label) {
  if (value && !source) {
    return { field, severity: 'warning', message: `${label || field} references "${value}" but no matching record was found.`, expected_value: 'Matching record', actual_value: 'Not found' };
  }
  return null;
}

// ── Validation runner ────────────────────────────────────────────────────────

export function runValidators(...validators) {
  return validators.flat().filter(Boolean);
}

export function hasErrors(results) {
  return results.some(r => r.severity === 'error');
}

export function errorsOnly(results) {
  return results.filter(r => r.severity === 'error');
}

export function warningsOnly(results) {
  return results.filter(r => r.severity === 'warning');
}