import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  Building2, LayoutDashboard, Home, Users, DollarSign,
  Wrench, LogOut, Menu, X, MapPin, ChevronRight, UserCircle2, AlertTriangle, Bell, RefreshCcw, DoorOpen,
} from "lucide-react";
import { logout } from "../app/slices/authSlice";
import toast from "react-hot-toast";
import { Modal } from "./UI";

const ownerLinks = [
  { to: "/owner/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/owner/properties", label: "Properties", icon: Home },
  { to: "/owner/tenants", label: "Tenants & Leases", icon: Users },
  { to: "/owner/renewals", label: "Lease Renewals", icon: RefreshCcw },
  { to: "/owner/move-out", label: "Move-Out Requests", icon: DoorOpen },
  { to: "/owner/rent", label: "Rent Management", icon: DollarSign },
  { to: "/owner/maintenance", label: "Maintenance", icon: Wrench },
  { to: "/owner/vacancies", label: "Vacancies", icon: MapPin },
  { to: "/owner/notifications", label: "Notifications", icon: Bell },
  { to: "/owner/profile", label: "My Profile", icon: UserCircle2 },
];

const tenantLinks = [
  { to: "/tenant/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/tenant/rent", label: "Rent & Payments", icon: DollarSign },
  { to: "/tenant/maintenance", label: "My Requests", icon: Wrench },
  { to: "/tenant/notifications", label: "Notifications", icon: Bell },
  { to: "/tenant/profile", label: "My Profile", icon: UserCircle2 },
];

const Sidebar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.auth);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);

  const links = user?.role === "owner" ? ownerLinks : tenantLinks;

  const handleLogout = () => {
    dispatch(logout());
    setLogoutModalOpen(false);
    setMobileOpen(false);
    toast.success("Logged out successfully.");
    navigate("/login");
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
        <div className="p-2 bg-blue-600 rounded-xl">
          <Building2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-bold text-gray-900 text-sm">PropManager</p>
          <p className="text-xs text-gray-500 capitalize">{user?.role} Portal</p>
        </div>
      </div>

      {/* User Info */}
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
            {user?.name?.charAt(0)?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`
            }
          >
            <Icon size={18} />
            <span className="flex-1">{label}</span>
            <ChevronRight size={14} className="opacity-40" />
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-4 py-4 border-t border-gray-100">
        <button
          onClick={() => setLogoutModalOpen(true)}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 w-full transition-all duration-150"
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md border border-gray-200"
      >
        <Menu size={20} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div
        className={`lg:hidden fixed left-0 top-0 h-full w-64 bg-white shadow-xl z-50 transform transition-transform duration-300 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 p-1 rounded-lg hover:bg-gray-100"
        >
          <X size={18} />
        </button>
        <SidebarContent />
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-white h-screen sticky top-0 border-r border-gray-100 shadow-sm">
        <SidebarContent />
      </aside>

      <Modal isOpen={logoutModalOpen} onClose={() => setLogoutModalOpen(false)} title="Confirm Logout">
        <div className="space-y-4">
          <div className="rounded-2xl border border-red-100 bg-gradient-to-br from-red-50 via-white to-orange-50 p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-red-100 p-2 text-red-600">
                <AlertTriangle size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">You are about to log out</p>
                <p className="mt-1 text-xs text-gray-600">
                  You will be redirected to the sign-in page and will need credentials to access your dashboard again.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setLogoutModalOpen(false)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Stay Logged In
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg bg-gradient-to-r from-red-600 to-orange-600 px-4 py-2 text-sm font-semibold text-white hover:from-red-700 hover:to-orange-700 shadow-sm"
            >
              Yes, Logout
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default Sidebar;
