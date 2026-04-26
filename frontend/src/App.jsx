import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Provider } from "react-redux";
import { Toaster } from "react-hot-toast";
import store from "./app/store";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminProtectedRoute from "./components/AdminProtectedRoute";
import Layout from "./components/Layout";

// Landing
import LandingPage from "./pages/LandingPage";
import BrowseProperties from "./pages/BrowseProperties";
import FAQ from "./pages/FAQ";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsAndConditions from "./pages/TermsAndConditions";
import VendorOnboarding from "./pages/VendorOnboarding";

// Auth
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import Profile from "./pages/Profile";
import Notifications from "./pages/Notifications";

// Vendor
import VendorDashboard from "./pages/vendor/VendorDashboard";
import VendorMaintenance from "./pages/vendor/VendorMaintenance";
import VendorMaintenanceDetail from "./pages/vendor/VendorMaintenanceDetail";

// Owner
import OwnerDashboard from "./pages/owner/OwnerDashboard";
import Properties from "./pages/owner/Properties";
import PropertyWorkspace from "./pages/owner/PropertyWorkspace";
import TenantsLeases from "./pages/owner/TenantsLeases";
import LeaseRenewals from "./pages/owner/LeaseRenewals";
import MoveOutRequests from "./pages/owner/MoveOutRequests";
import RentManagement from "./pages/owner/RentManagement";
import OwnerPaymentDetails from "./pages/owner/OwnerPaymentDetails";
import Maintenance from "./pages/owner/Maintenance";
import Vacancies from "./pages/owner/Vacancies";
import OwnerInquiries from "./pages/owner/OwnerInquiries";
import OwnerVendors from "./pages/owner/OwnerVendors";
import Expenses from "./pages/owner/Expenses";
import AdvancedAnalytics from "./pages/owner/AdvancedAnalytics";
import PropertyReviews from "./pages/owner/PropertyReviews";

// Tenant
import TenantDashboard from "./pages/tenant/TenantDashboard";
import TenantRent from "./pages/tenant/TenantRent";
import TenantMaintenance from "./pages/tenant/TenantMaintenance";
import TenantInquiries from "./pages/tenant/TenantInquiries";
import TenantReview from "./pages/tenant/TenantReview";
import AdminDashboard from "./pages/admin/AdminDashboard";

function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <Toaster
          position="top-right"
          gutter={10}
          toastOptions={{
            duration: 4000,
            style: {
              borderRadius: "16px",
              padding: "14px 18px",
              fontSize: "14px",
              fontWeight: "500",
              boxShadow: "0 8px 32px rgba(0,0,0,0.14)",
              maxWidth: "380px",
            },
            success: {
              duration: 3500,
              style: {
                background: "#f0fdf4",
                color: "#166534",
                border: "1.5px solid #86efac",
              },
              iconTheme: { primary: "#16a34a", secondary: "#f0fdf4" },
            },
            error: {
              duration: 6000,
              style: {
                background: "#fef2f2",
                color: "#991b1b",
                border: "1.5px solid #fca5a5",
              },
              iconTheme: { primary: "#dc2626", secondary: "#fef2f2" },
            },
          }}
        />
        <Routes>
          {/* Public */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/properties" element={<BrowseProperties />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
          <Route path="/vendor-onboarding" element={<VendorOnboarding />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Admin Route */}
          <Route
            path="/admin/dashboard"
            element={
              <AdminProtectedRoute>
                <AdminDashboard />
              </AdminProtectedRoute>
            }
          />

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
            <Route path="properties/:propertyId/manage" element={<PropertyWorkspace />} />
            <Route path="tenants" element={<TenantsLeases />} />
            <Route path="renewals" element={<LeaseRenewals />} />
            <Route path="move-out" element={<MoveOutRequests />} />
            <Route path="rent" element={<RentManagement />} />
            <Route path="payment-details" element={<OwnerPaymentDetails />} />
            <Route path="maintenance" element={<Maintenance />} />
            <Route path="inquiries" element={<OwnerInquiries />} />
            <Route path="vendors" element={<OwnerVendors />} />
            <Route path="vacancies" element={<Vacancies />} />
            <Route path="expenses" element={<Expenses />} />
            <Route path="analytics" element={<AdvancedAnalytics />} />
            <Route path="reviews" element={<PropertyReviews />} />
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
            <Route path="inquiries" element={<TenantInquiries />} />
            <Route path="reviews" element={<TenantReview />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="profile" element={<Profile />} />
          </Route>

          {/* Vendor Routes */}
          <Route
            path="/vendor"
            element={
              <ProtectedRoute role="vendor">
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/vendor/dashboard" replace />} />
            <Route path="dashboard" element={<VendorDashboard />} />
            <Route path="maintenance" element={<VendorMaintenance />} />
            <Route path="maintenance/:id" element={<VendorMaintenanceDetail />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="profile" element={<Navigate to="/vendor/dashboard" replace />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </Provider>
  );
}

export default App;
