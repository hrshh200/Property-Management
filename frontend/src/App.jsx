import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Provider } from "react-redux";
import { Toaster } from "react-hot-toast";
import store from "./app/store";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";

// Landing
import LandingPage from "./pages/LandingPage";

// Auth
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import Profile from "./pages/Profile";
import Notifications from "./pages/Notifications";

// Owner
import OwnerDashboard from "./pages/owner/OwnerDashboard";
import Properties from "./pages/owner/Properties";
import TenantsLeases from "./pages/owner/TenantsLeases";
import LeaseRenewals from "./pages/owner/LeaseRenewals";
import MoveOutRequests from "./pages/owner/MoveOutRequests";
import RentManagement from "./pages/owner/RentManagement";
import Maintenance from "./pages/owner/Maintenance";
import Vacancies from "./pages/owner/Vacancies";

// Tenant
import TenantDashboard from "./pages/tenant/TenantDashboard";
import TenantRent from "./pages/tenant/TenantRent";
import TenantMaintenance from "./pages/tenant/TenantMaintenance";

function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
        <Routes>
          {/* Public */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Owner Routes */}
          <Route
            path="/owner"
            element={
              <ProtectedRoute role="owner">
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/owner/dashboard" replace />} />
            <Route path="dashboard" element={<OwnerDashboard />} />
            <Route path="properties" element={<Properties />} />
            <Route path="tenants" element={<TenantsLeases />} />
            <Route path="renewals" element={<LeaseRenewals />} />
            <Route path="move-out" element={<MoveOutRequests />} />
            <Route path="rent" element={<RentManagement />} />
            <Route path="maintenance" element={<Maintenance />} />
            <Route path="vacancies" element={<Vacancies />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="profile" element={<Profile />} />
          </Route>

          {/* Tenant Routes */}
          <Route
            path="/tenant"
            element={
              <ProtectedRoute role="tenant">
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/tenant/dashboard" replace />} />
            <Route path="dashboard" element={<TenantDashboard />} />
            <Route path="rent" element={<TenantRent />} />
            <Route path="maintenance" element={<TenantMaintenance />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="profile" element={<Profile />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </Provider>
  );
}

export default App;
