import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './features/auth/AuthContext.jsx';
import { DashboardLayout } from './layouts/DashboardLayout.jsx';
import { LoadingSpinner } from './components/common/LoadingSpinner.jsx';

// Pages
import { LoginPage } from './pages/LoginPage.jsx';
import { DashboardPage } from './pages/DashboardPage.jsx';
import { GenerateTimetablePage } from './pages/GenerateTimetablePage.jsx';
import { TimetableCalendarPage } from './pages/TimetableCalendarPage.jsx';
import { ProgrammesPage } from './pages/ProgrammesPage.jsx';
import { SubjectsPage } from './pages/SubjectsPage.jsx';
import { FacultyPage } from './pages/FacultyPage.jsx';
import { RoomsPage } from './pages/RoomsPage.jsx';
import { ConstraintsPage } from './pages/ConstraintsPage.jsx';
import { ConflictsPage } from './pages/ConflictsPage.jsx';
import { VersionsPage } from './pages/VersionsPage.jsx';
import { ReportsPage } from './pages/ReportsPage.jsx';
import { AuditLogsPage } from './pages/AuditLogsPage.jsx';
import { UsersPage } from './pages/UsersPage.jsx';
import { SettingsPage } from './pages/SettingsPage.jsx';

// Protected Route Guard with RBAC checks
function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingSpinner message="Authenticating Schedulix..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

// Public Route Guard (Redirects away from login if already signed in)
function PublicRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingSpinner message="Loading..." />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication Route */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />

          {/* Protected Application Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route
              path="generate"
              element={
                <ProtectedRoute allowedRoles={['admin', 'coordinator']}>
                  <GenerateTimetablePage />
                </ProtectedRoute>
              }
            />
            <Route path="calendar" element={<TimetableCalendarPage />} />
            <Route
              path="programmes"
              element={
                <ProtectedRoute allowedRoles={['admin', 'coordinator']}>
                  <ProgrammesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="subjects"
              element={
                <ProtectedRoute allowedRoles={['admin', 'coordinator']}>
                  <SubjectsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="faculty"
              element={
                <ProtectedRoute allowedRoles={['admin', 'coordinator', 'faculty']}>
                  <FacultyPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="rooms"
              element={
                <ProtectedRoute allowedRoles={['admin', 'coordinator']}>
                  <RoomsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="constraints"
              element={
                <ProtectedRoute allowedRoles={['admin', 'coordinator']}>
                  <ConstraintsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="conflicts"
              element={
                <ProtectedRoute allowedRoles={['admin', 'coordinator']}>
                  <ConflictsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="versions"
              element={
                <ProtectedRoute allowedRoles={['admin', 'coordinator']}>
                  <VersionsPage />
                </ProtectedRoute>
              }
            />
            <Route path="reports" element={<ReportsPage />} />
            <Route
              path="audit"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AuditLogsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="users"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <UsersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="settings"
              element={
                <ProtectedRoute allowedRoles={['admin', 'coordinator']}>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
