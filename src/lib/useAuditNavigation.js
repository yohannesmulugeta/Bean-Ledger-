import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

export default function useAuditNavigation() {
  const [searchParams, setSearchParams] = useSearchParams();
  const auditRecordId = searchParams.get('auditRecordId');
  const auditIssueTitle = searchParams.get('auditIssueTitle');
  const [recordFound, setRecordFound] = useState(null); // null = pending, true = found, false = not found
  const [highlightedRow, setHighlightedRow] = useState(null);

  const findRecord = useCallback((rowId) => {
    setRecordFound(null);
    // Small delay to ensure DOM is ready
    setTimeout(() => {
      const el = document.getElementById(rowId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setHighlightedRow(rowId);
        setRecordFound(true);
        // Remove highlight after 4 seconds
        setTimeout(() => setHighlightedRow(null), 4000);
      } else {
        setRecordFound(false);
      }
    }, 300);
  }, []);

  const dismissAudit = useCallback(() => {
    searchParams.delete('auditRecordId');
    searchParams.delete('auditIssueTitle');
    setSearchParams(searchParams, { replace: true });
    setRecordFound(null);
    setHighlightedRow(null);
  }, [searchParams, setSearchParams]);

  // Auto-find on mount if audit params present
  useEffect(() => {
    if (auditRecordId) {
      // We defer to the page to call findRecord with the correct rowId
      setRecordFound(null);
    }
  }, [auditRecordId]);

  return {
    auditRecordId,
    auditIssueTitle,
    recordFound,
    highlightedRow,
    findRecord,
    dismissAudit,
  };
}