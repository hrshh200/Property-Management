import React from "react";
import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";

const parseAdminEmails = () =>
  String(import.meta.env.VITE_ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

const defaultAdminEmail = String(import.meta.env.VITE_ADMIN_LOGIN_EMAIL || "admin@admin.com")
  .trim()
  .toLowerCase();

const AdminProtectedRoute = ({ children }) => {
  const { isAuthenticated, user } = useSelector((s) => s.auth);

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const admins = parseAdminEmails();
  const email = String(user?.email || "").trim().toLowerCase();
  const isSpecialAdmin = user?.role === "admin" && email === defaultAdminEmail;
  const isAllowListedAdmin = email && admins.length > 0 && admins.includes(email);

  if (!isSpecialAdmin && !isAllowListedAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default AdminProtectedRoute;
