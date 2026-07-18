import { Toaster } from "@/components/ui/toaster"
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import ModuleRouteGuard from '@/components/ModuleRouteGuard';
import Login from '@/pages/Login';
import { ensureDemoDatasetVersion } from '@/services/demoStore';

ensureDemoDatasetVersion();

const Dashboard = lazy(() => import('@/pages/Dashboard'));
const MasterData = lazy(() => import('@/pages/MasterData'));
const PurchaseRegistration = lazy(() => import('@/pages/PurchaseRegistration.jsx'));
const WarehouseReceiptPage = lazy(() => import('@/pages/WarehouseReceipt'));
const SampleLogPage = lazy(() => import('@/pages/SampleLogPage'));
const ProcessingLogPage = lazy(() => import('@/pages/ProcessingLogPage'));
const OutputReportPage = lazy(() => import('@/pages/OutputReportPage'));
const Reports = lazy(() => import('@/pages/Reports'));
const ExportContracts = lazy(() => import('@/pages/ExportContracts'));
const StockReport = lazy(() => import('@/pages/StockReport.jsx'));
const NotificationSettings = lazy(() => import('@/pages/NotificationSettings'));
const BuyerInspections = lazy(() => import('@/pages/BuyerInspections.jsx'));
const MaterialsRegister = lazy(() => import('@/pages/MaterialsRegister.jsx'));
const BagLedger = lazy(() => import('@/pages/BagLedger.jsx'));
const ActivityLog = lazy(() => import('@/pages/ActivityLog.jsx'));
const NotificationHistory = lazy(() => import('@/pages/NotificationHistory.jsx'));
const Permissions = lazy(() => import('@/pages/Permissions.jsx'));
const PurchaseOrdersReport = lazy(() => import('@/pages/PurchaseOrdersReport'));
const WarehouseReceiptReport = lazy(() => import('@/pages/WarehouseReceiptReport'));
const UsersManagement = lazy(() => import('@/pages/UsersManagement'));
const DataAudit = lazy(() => import('@/pages/DataAudit'));
const AdjustmentCenter = lazy(() => import('@/pages/AdjustmentCenter'));
const YearClose = lazy(() => import('@/pages/YearClose'));
const CommissionReport = lazy(() => import('@/pages/CommissionReport'));
const BackupCenter = lazy(() => import('@/pages/BackupCenter'));

const RouteLoadingFallback = () => (
  <div className="min-h-[50vh] flex items-center justify-center bg-background text-sm text-muted-foreground">
    Loading page...
  </div>
);

const protectedRoute = (path, PageComponent) => (
  <ModuleRouteGuard path={path}>
    <Suspense fallback={<RouteLoadingFallback />}>
      <PageComponent />
    </Suspense>
  </ModuleRouteGuard>
);

// ── Public Demo Mode — no auth required, render immediately ──────────────
const AuthenticatedApp = () => {
  const { isAuthenticated, isLoadingAuth, authChecked } = useAuth();

  if (isLoadingAuth || !authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-sm text-muted-foreground">
        Loading demo session...
      </div>
    );
  }

  return (
    <Routes>
      {/* Demo auth pages */}
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/register" element={<Navigate to="/login" replace />} />
      <Route path="/signup" element={<Navigate to="/login" replace />} />
      <Route path="/forgot-password" element={<Navigate to="/login" replace />} />
      <Route path="/reset-password" element={<Navigate to="/login" replace />} />
      {/* Protected demo app routes */}
      <Route element={isAuthenticated ? <AppLayout /> : <Navigate to="/login" replace />}>
        <Route path="/" element={protectedRoute("/", Dashboard)} />
        <Route path="/purchases" element={<Navigate to="/purchase-registration" replace />} />
        <Route path="/warehouse" element={<Navigate to="/warehouse-receipt" replace />} />
        <Route path="/processing" element={<Navigate to="/processing-log" replace />} />
        <Route path="/exports" element={<Navigate to="/export-contracts" replace />} />
        <Route path="/master-data" element={protectedRoute("/master-data", MasterData)} />
        <Route path="/purchase-registration" element={protectedRoute("/purchase-registration", PurchaseRegistration)} />
        <Route path="/warehouse-receipt" element={protectedRoute("/warehouse-receipt", WarehouseReceiptPage)} />
        <Route path="/sample-log" element={protectedRoute("/sample-log", SampleLogPage)} />
        <Route path="/processing-log" element={protectedRoute("/processing-log", ProcessingLogPage)} />
        <Route path="/output-report" element={protectedRoute("/output-report", OutputReportPage)} />
        <Route path="/reports" element={protectedRoute("/reports", Reports)} />
        <Route path="/buyer-inspections" element={protectedRoute("/buyer-inspections", BuyerInspections)} />
        <Route path="/export-contracts" element={protectedRoute("/export-contracts", ExportContracts)} />
        <Route path="/materials-register" element={protectedRoute("/materials-register", MaterialsRegister)} />
        <Route path="/bag-ledger" element={protectedRoute("/bag-ledger", BagLedger)} />
        <Route path="/stock-report" element={protectedRoute("/stock-report", StockReport)} />
        <Route path="/notification-settings" element={protectedRoute("/notification-settings", NotificationSettings)} />
        <Route path="/activity-log" element={protectedRoute("/activity-log", ActivityLog)} />
        <Route path="/notification-history" element={protectedRoute("/notification-history", NotificationHistory)} />
        <Route path="/permissions" element={protectedRoute("/permissions", Permissions)} />
        <Route path="/user-report" element={<Navigate to="/activity-log?view=users" replace />} />
        <Route path="/purchase-orders-report" element={protectedRoute("/purchase-orders-report", PurchaseOrdersReport)} />
        <Route path="/warehouse-receipt-report" element={protectedRoute("/warehouse-receipt-report", WarehouseReceiptReport)} />
        <Route path="/users-management" element={protectedRoute("/users-management", UsersManagement)} />
        <Route path="/data-audit" element={protectedRoute("/data-audit", DataAudit)} />
        <Route path="/adjustment-center" element={protectedRoute("/adjustment-center", AdjustmentCenter)} />
        <Route path="/year-close" element={protectedRoute("/year-close", YearClose)} />
        <Route path="/supplier-remaining-explanation" element={<Navigate to="/stock-report?view=supplier-reconciliation" replace />} />
        <Route path="/commission-report" element={protectedRoute("/commission-report", CommissionReport)} />
        <Route path="/backup-center" element={protectedRoute("/backup-center", BackupCenter)} />
      </Route>
      <Route path="*" element={isAuthenticated ? <PageNotFound /> : <Navigate to="/login" replace />} />
    </Routes>
  );
};


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

function AppContent() {
  return (
    <AuthProvider>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthenticatedApp />
      </Router>
      <Toaster />
    </AuthProvider>
  )
}
