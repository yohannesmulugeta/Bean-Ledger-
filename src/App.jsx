import { Toaster } from "@/components/ui/toaster"
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import MasterData from '@/pages/MasterData';
import PurchaseRegistration from '@/pages/PurchaseRegistration.jsx';
import WarehouseReceiptPage from '@/pages/WarehouseReceipt';
import SampleLogPage from '@/pages/SampleLogPage';
import ProcessingLogPage from '@/pages/ProcessingLogPage';
import OutputReportPage from '@/pages/OutputReportPage';
import Reports from '@/pages/Reports';
import ExportContracts from '@/pages/ExportContracts';
import StockReport from '@/pages/StockReport.jsx';
import NotificationSettings from '@/pages/NotificationSettings';
import BuyerInspections from '@/pages/BuyerInspections.jsx';
import MaterialsRegister from '@/pages/MaterialsRegister.jsx';
import BagLedger from '@/pages/BagLedger.jsx';
import ActivityLog from '@/pages/ActivityLog.jsx';
import NotificationHistory from '@/pages/NotificationHistory.jsx';
import Permissions from '@/pages/Permissions.jsx';
import UserActivityReport from '@/pages/UserActivityReport';
import PurchaseOrdersReport from '@/pages/PurchaseOrdersReport';
import WarehouseReceiptReport from '@/pages/WarehouseReceiptReport';
import UsersManagement from '@/pages/UsersManagement';
import DataAudit from '@/pages/DataAudit';
import ModuleRouteGuard from '@/components/ModuleRouteGuard';
import Login from '@/pages/Login';

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
        <Route path="/" element={<ModuleRouteGuard path="/"><Dashboard /></ModuleRouteGuard>} />
        <Route path="/purchases" element={<Navigate to="/purchase-registration" replace />} />
        <Route path="/warehouse" element={<Navigate to="/warehouse-receipt" replace />} />
        <Route path="/processing" element={<Navigate to="/processing-log" replace />} />
        <Route path="/exports" element={<Navigate to="/export-contracts" replace />} />
        <Route path="/master-data" element={<ModuleRouteGuard path="/master-data"><MasterData /></ModuleRouteGuard>} />
        <Route path="/purchase-registration" element={<ModuleRouteGuard path="/purchase-registration"><PurchaseRegistration /></ModuleRouteGuard>} />
        <Route path="/warehouse-receipt" element={<ModuleRouteGuard path="/warehouse-receipt"><WarehouseReceiptPage /></ModuleRouteGuard>} />
        <Route path="/sample-log" element={<ModuleRouteGuard path="/sample-log"><SampleLogPage /></ModuleRouteGuard>} />
        <Route path="/processing-log" element={<ModuleRouteGuard path="/processing-log"><ProcessingLogPage /></ModuleRouteGuard>} />
        <Route path="/output-report" element={<ModuleRouteGuard path="/output-report"><OutputReportPage /></ModuleRouteGuard>} />
        <Route path="/reports" element={<ModuleRouteGuard path="/reports"><Reports /></ModuleRouteGuard>} />
        <Route path="/buyer-inspections" element={<ModuleRouteGuard path="/buyer-inspections"><BuyerInspections /></ModuleRouteGuard>} />
        <Route path="/export-contracts" element={<ModuleRouteGuard path="/export-contracts"><ExportContracts /></ModuleRouteGuard>} />
        <Route path="/materials-register" element={<ModuleRouteGuard path="/materials-register"><MaterialsRegister /></ModuleRouteGuard>} />
        <Route path="/bag-ledger" element={<ModuleRouteGuard path="/bag-ledger"><BagLedger /></ModuleRouteGuard>} />
        <Route path="/stock-report" element={<ModuleRouteGuard path="/stock-report"><StockReport /></ModuleRouteGuard>} />
        <Route path="/notification-settings" element={<ModuleRouteGuard path="/notification-settings"><NotificationSettings /></ModuleRouteGuard>} />
        <Route path="/activity-log" element={<ModuleRouteGuard path="/activity-log"><ActivityLog /></ModuleRouteGuard>} />
        <Route path="/notification-history" element={<ModuleRouteGuard path="/notification-history"><NotificationHistory /></ModuleRouteGuard>} />
        <Route path="/permissions" element={<ModuleRouteGuard path="/permissions"><Permissions /></ModuleRouteGuard>} />
        <Route path="/user-report" element={<ModuleRouteGuard path="/user-report"><UserActivityReport /></ModuleRouteGuard>} />
        <Route path="/purchase-orders-report" element={<ModuleRouteGuard path="/purchase-orders-report"><PurchaseOrdersReport /></ModuleRouteGuard>} />
        <Route path="/warehouse-receipt-report" element={<ModuleRouteGuard path="/warehouse-receipt-report"><WarehouseReceiptReport /></ModuleRouteGuard>} />
        <Route path="/users-management" element={<ModuleRouteGuard path="/users-management"><UsersManagement /></ModuleRouteGuard>} />
        <Route path="/data-audit" element={<ModuleRouteGuard path="/data-audit"><DataAudit /></ModuleRouteGuard>} />
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
      <Router>
        <AuthenticatedApp />
      </Router>
      <Toaster />
    </AuthProvider>
  )
}
