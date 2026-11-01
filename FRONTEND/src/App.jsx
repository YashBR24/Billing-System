import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
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
import { FaBars } from 'react-icons/fa';
import AuthService from './services/AuthService';

const ProtectedRoute = ({ children }) => {
  const currentUser = AuthService.getCurrentUser();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!currentUser || currentUser.role !== 'admin') {
    return <Navigate to="/login" replace />;
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

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          
          {/* Protected Dashboard Route */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            } 
          />
          {/* Protected GST Dashboard Route */}
          <Route 
            path="/gst"
            element={
              <ProtectedRoute>
                <GSTDashboard />
              </ProtectedRoute>
            }
          />

          {/* Protected Company Page Route */}
          <Route
            path="/companies"
            element={
              <ProtectedRoute>
                <CompanyPage />
              </ProtectedRoute>
            }
          />

          {/* Protected Settings Page Route */}
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />

          {/* Credit Note Routes */}
          <Route
            path="/credit-notes"
            element={
              <ProtectedRoute>
                <CreditNoteListPage />
              </ProtectedRoute>
            }
          />

          {/* Debit Note Routes */}
          <Route
            path="/debit-notes"
            element={
              <ProtectedRoute>
                <DebitNoteListPage />
              </ProtectedRoute>
            }
          />
          
          {/* Interest Note Routes */}
          <Route
            path="/interest-notes"
            element={
              <ProtectedRoute>
                <InterestNoteListPage />
              </ProtectedRoute>
            }
           />

          {/* Protected Billing Routes */}
          <Route
            path="/bills"
            element={
              <ProtectedRoute>
                <BillListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bills/create"
            element={
              <ProtectedRoute>
                <BillListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bills/:id"
            element={
              <ProtectedRoute>
                <BillListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bills/edit/:id"
            element={
              <ProtectedRoute>
                <BillListPage />
              </ProtectedRoute>
            }
          />

          {/* Protected Challan Routes */}
          <Route
            path="/challans"
            element={
              <ProtectedRoute>
                <ChallanListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/challans/create"
            element={
              <ProtectedRoute>
                <ChallanListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/challans/:id"
            element={
              <ProtectedRoute>
                <ChallanListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/challans/edit/:id"
            element={
              <ProtectedRoute>
                <ChallanListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/challans/download"
            element={
              <ProtectedRoute>
                <ChallanListPage />
              </ProtectedRoute>
            }
          />

          {/* Protected Box Routes */}
          <Route
            path="/boxes"
            element={
              <ProtectedRoute>
                <BoxListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/boxes/create"
            element={
              <ProtectedRoute>
                <BoxListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/boxes/:id"
            element={
              <ProtectedRoute>
                <BoxListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/boxes/detail/:id"
            element={
              <ProtectedRoute>
                <BoxListPage />
              </ProtectedRoute>
            }
          />

          {/* Protected Worker & Attendance Routes */}
          <Route
            path="/workers"
            element={
              <ProtectedRoute>
                <WorkerPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/attendance"
            element={
              <ProtectedRoute>
                <AttendancePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/attendance/report"
            element={
              <ProtectedRoute>
                <MonthlyReportPage />
              </ProtectedRoute>
            }
          />

          {/* Protected Purchase Routes */}
          <Route
            path="/purchases"
            element={
              <ProtectedRoute>
                <PurchaseListPage />
              </ProtectedRoute>
            }
          />

          {/* Protected Transaction Routes */}
          <Route
            path="/transactions"
            element={
              <ProtectedRoute>
                <TransactionListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/transactions/add"
            element={
              <ProtectedRoute>
                <TransactionListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/transactions/:id"
            element={
              <ProtectedRoute>
                <TransactionListPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/bill-downloads"
            element={
              <ProtectedRoute>
                <BillListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin-panel"
            element={
              <ProtectedRoute>
                <AdminPanelPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/company-ledger"
            element={
              <ProtectedRoute>
                <CompanyLedgerPage />
              </ProtectedRoute>
            }
          />

          {/* Default route */}
          <Route 
            path="/" 
            element={
              AuthService.getCurrentUser() && AuthService.getCurrentUser().role === 'admin' ? (
                <Navigate to="/dashboard" replace />
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