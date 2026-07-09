import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import GSTDashboard from './pages/GSTDashboard';
import CompanyPage from './pages/Company/CompanyPage';
import SettingsPage from './pages/Setting/SettingsPage';
import BillListPage from './pages/Bills/BillListPage';
import WorkerPage from './pages/Worker/WorkerPage';
import AttendancePage from './pages/Worker/AttendancePage';
import MonthlyReportPage from './pages/Worker/MonthlyReportPage';
import PurchaseListPage from './pages/Purchases/PurchaseListPage';
import CreditNoteListPage from './pages/Creditnote/CreditNoteListPage';
import DebitNoteListPage from './pages/DebitNote/DebitNoteListPage';
import InterestNoteListPage from './pages//IntrestNote//InterestNoteListPage';
import TransactionListPage from './pages/Transaction/TransactionListPage';
import AdminPanelPage from './pages/AdminPanelPage';
import CompanyLedgerPage from './pages/Ledger/CompanyLedgerPage';
import ChallanListPage from './pages/Challan/ChallanListPage';
import BoxListPage from './pages/Box/BoxListPage';
import Sidebar from './components/Sidebar';
import OrganizationPicker from './pages/SuperAdmin/OrganizationPicker';
import OrganizationManagement from './pages/SuperAdmin/OrganizationManagement';
import UserManagement from './pages/SuperAdmin/UserManagement';
import AuthService from './services/AuthService';
import { FaBars, FaTimes } from 'react-icons/fa';
import { Building2, Users, ArrowLeft, Shield, LogOut } from 'lucide-react';

// ─── Regular Protected Route (requires org selected) ────────────────────────
const ProtectedRoute = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const currentUser = AuthService.getCurrentUser();

  if (!currentUser || !currentUser.token) {
    return <Navigate to="/login" replace />;
  }

  if (currentUser.needsOrgSelection) {
    return <Navigate to="/select-organization" replace />;
  }

  return (
    <div className="flex min-h-screen bg-gray-100 relative">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <main className="flex-grow xl:pl-12 xl:ml-64">
        {children}
      </main>
    </div>
  );
};

// ─── SuperAdmin Layout with its own nav (no org required) ───────────────────
const SuperAdminLayout = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const currentUser = AuthService.getCurrentUser();

  const handleLogout = () => {
    AuthService.logout?.();
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* SuperAdmin Top Nav */}
      <header className="bg-slate-900 text-white shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Left: Brand + Nav links */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-400" />
              <span className="font-bold text-lg tracking-tight">SuperAdmin</span>
            </div>
            <nav className="hidden md:flex items-center gap-1">
              <button
                onClick={() => navigate('/superadmin/organizations')}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
              >
                <Building2 className="h-4 w-4" />
                Organizations
              </button>
              <button
                onClick={() => navigate('/superadmin/users')}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
              >
                <Users className="h-4 w-4" />
                Users
              </button>
            </nav>
          </div>

          {/* Right: Switch Org + Logout */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/select-organization')}
              className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Switch Org
            </button>
            <span className="hidden md:block text-xs text-slate-400 border-l border-slate-700 pl-3">
              {currentUser?.email}
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-red-400 hover:text-red-300 hover:bg-slate-700 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden md:inline">Logout</span>
            </button>

            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-slate-700"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <FaTimes /> : <FaBars />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-slate-700 px-4 py-3 flex flex-col gap-2 bg-slate-900">
            <button
              onClick={() => { navigate('/superadmin/organizations'); setMobileOpen(false); }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-700"
            >
              <Building2 className="h-4 w-4" />
              Organizations
            </button>
            <button
              onClick={() => { navigate('/superadmin/users'); setMobileOpen(false); }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-700"
            >
              <Users className="h-4 w-4" />
              Users
            </button>
            <button
              onClick={() => { navigate('/select-organization'); setMobileOpen(false); }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Switch Org
            </button>
          </div>
        )}
      </header>

      {/* Page content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
};

// ─── SuperAdmin Route Guard (does NOT require org selection) ─────────────────
const SuperAdminRoute = ({ children }) => {
  const currentUser = AuthService.getCurrentUser();

  if (!currentUser || !currentUser.token) {
    return <Navigate to="/login" replace />;
  }

  if (currentUser.role !== 'superadmin') {
    return <Navigate to="/dashboard" replace />;
  }

  // ✅ SuperAdmin can access this even when needsOrgSelection is true
  return <SuperAdminLayout>{children}</SuperAdminLayout>;
};

// ─── App ─────────────────────────────────────────────────────────────────────
function App() {
  const currentUser = AuthService.getCurrentUser();

  useEffect(() => {
    if (currentUser?.organization) {
      document.title = `${currentUser.organization.name} - Billing System`;
    } else {
      document.title = 'Billing System';
    }
  }, [currentUser?.organization]);

  return (
    <Router>
      <div className="App">
        <Routes>
          {/* ── Public ── */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/select-organization" element={<OrganizationPicker />} />

          {/* ── SuperAdmin (no org required) ── */}
          <Route
            path="/superadmin/organizations"
            element={
              <SuperAdminRoute>
                <OrganizationManagement />
              </SuperAdminRoute>
            }
          />
          <Route
            path="/superadmin/users"
            element={
              <SuperAdminRoute>
                <UserManagement />
              </SuperAdminRoute>
            }
          />

          {/* ── Protected (org required) ── */}
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/gst" element={<ProtectedRoute><GSTDashboard /></ProtectedRoute>} />
          <Route path="/companies" element={<ProtectedRoute><CompanyPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/credit-notes" element={<ProtectedRoute><CreditNoteListPage /></ProtectedRoute>} />
          <Route path="/debit-notes" element={<ProtectedRoute><DebitNoteListPage /></ProtectedRoute>} />
          <Route path="/interest-notes" element={<ProtectedRoute><InterestNoteListPage /></ProtectedRoute>} />
          <Route path="/bills" element={<ProtectedRoute><BillListPage /></ProtectedRoute>} />
          <Route path="/bills/create" element={<ProtectedRoute><BillListPage /></ProtectedRoute>} />
          <Route path="/bills/:id" element={<ProtectedRoute><BillListPage /></ProtectedRoute>} />
          <Route path="/bills/edit/:id" element={<ProtectedRoute><BillListPage /></ProtectedRoute>} />
          <Route path="/challans" element={<ProtectedRoute><ChallanListPage /></ProtectedRoute>} />
          <Route path="/challans/create" element={<ProtectedRoute><ChallanListPage /></ProtectedRoute>} />
          <Route path="/challans/:id" element={<ProtectedRoute><ChallanListPage /></ProtectedRoute>} />
          <Route path="/challans/edit/:id" element={<ProtectedRoute><ChallanListPage /></ProtectedRoute>} />
          <Route path="/challans/download" element={<ProtectedRoute><ChallanListPage /></ProtectedRoute>} />
          <Route path="/boxes" element={<ProtectedRoute><BoxListPage /></ProtectedRoute>} />
          <Route path="/boxes/create" element={<ProtectedRoute><BoxListPage /></ProtectedRoute>} />
          <Route path="/boxes/:id" element={<ProtectedRoute><BoxListPage /></ProtectedRoute>} />
          <Route path="/boxes/detail/:id" element={<ProtectedRoute><BoxListPage /></ProtectedRoute>} />
          <Route path="/workers" element={<ProtectedRoute><WorkerPage /></ProtectedRoute>} />
          <Route path="/attendance" element={<ProtectedRoute><AttendancePage /></ProtectedRoute>} />
          <Route path="/attendance/report" element={<ProtectedRoute><MonthlyReportPage /></ProtectedRoute>} />
          <Route path="/purchases" element={<ProtectedRoute><PurchaseListPage /></ProtectedRoute>} />
          <Route path="/transactions" element={<ProtectedRoute><TransactionListPage /></ProtectedRoute>} />
          <Route path="/transactions/add" element={<ProtectedRoute><TransactionListPage /></ProtectedRoute>} />
          <Route path="/transactions/:id" element={<ProtectedRoute><TransactionListPage /></ProtectedRoute>} />
          <Route path="/bill-downloads" element={<ProtectedRoute><BillListPage /></ProtectedRoute>} />
          <Route path="/admin-panel" element={<SuperAdminRoute><AdminPanelPage /></SuperAdminRoute>} />
          <Route path="/company-ledger" element={<ProtectedRoute><CompanyLedgerPage /></ProtectedRoute>} />

          {/* ── Root redirect ── */}
          <Route
            path="/"
            element={
              currentUser?.token && !currentUser?.needsOrgSelection ? (
                <Navigate to="/dashboard" replace />
              ) : currentUser?.token && currentUser?.needsOrgSelection ? (
                <Navigate to="/select-organization" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;