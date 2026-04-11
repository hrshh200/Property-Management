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
  const isOwner = user?.role === "owner";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);

  const links = user?.role === "owner" ? ownerLinks : tenantLinks;
  const brandPanelClass = isOwner
    ? "from-indigo-50 via-white to-blue-50 border-indigo-100"
    : "from-emerald-50 via-white to-cyan-50 border-emerald-100";
  const brandIconClass = isOwner
    ? "from-indigo-600 to-blue-600"
    : "from-emerald-600 to-cyan-600";
  const activeLinkClass = isOwner
    ? "bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-[0_10px_24px_rgba(79,70,229,0.35)]"
    : "bg-gradient-to-r from-emerald-600 to-cyan-600 text-white shadow-[0_10px_24px_rgba(5,150,105,0.35)]";
  const inactiveLinkClass = isOwner
    ? "text-slate-600 hover:bg-indigo-50 hover:text-indigo-700"
    : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-700";

  const handleLogout = () => {
    dispatch(logout());
    setLogoutModalOpen(false);
    setMobileOpen(false);
    toast.success("Logged out successfully.");
    navigate("/");
  };

  const SidebarContent = () => (
    <div className={`relative flex flex-col h-full bg-gradient-to-b ${brandPanelClass}`}>
      <div className="pointer-events-none absolute -top-14 -left-10 h-44 w-44 rounded-full bg-white/50 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-40 w-40 rounded-full bg-slate-200/30 blur-3xl" />

      {/* Logo */}
      <div className="relative flex items-center gap-3 px-6 py-5 border-b border-white/60">
        <div className={`p-2 rounded-xl bg-gradient-to-br ${brandIconClass} shadow-lg`}>
          <Building2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-extrabold text-slate-900 text-sm tracking-wide">PropManager</p>
          <p className="text-xs text-slate-500 capitalize">{user?.role} Portal</p>
        </div>
      </div>

      {/* User Info */}
      <div className="relative px-5 py-4 border-b border-white/60">
        <div className="flex items-center gap-3 rounded-2xl border border-white/70 bg-white/70 p-3 backdrop-blur-sm shadow-sm">
          <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${brandIconClass} flex items-center justify-center text-white font-bold text-sm shadow-sm`}>
            {user?.name?.charAt(0)?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">{user?.name}</p>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="relative flex-1 px-4 py-4 space-y-1.5">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? activeLinkClass
                  : inactiveLinkClass
              }`
            }
          >
            <Icon size={18} className="transition-transform duration-200 group-hover:scale-110" />
            <span className="flex-1">{label}</span>
            <ChevronRight size={14} className="opacity-40 transition-transform duration-200 group-hover:translate-x-0.5" />
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="relative px-4 py-4 border-t border-white/70">
        <button
          onClick={() => setLogoutModalOpen(true)}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50/90 w-full transition-all duration-200"
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
        className={`lg:hidden fixed top-4 left-4 z-50 p-2.5 rounded-xl shadow-md border border-white/60 backdrop-blur-sm bg-gradient-to-r ${
          isOwner ? "from-indigo-600 to-blue-600" : "from-emerald-600 to-cyan-600"
        } text-white`}
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
        className={`lg:hidden fixed left-0 top-0 h-full w-72 shadow-xl z-50 transform transition-transform duration-300 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 p-1 rounded-lg hover:bg-white/70 z-10"
        >
          <X size={18} />
        </button>
        <SidebarContent />
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-72 h-screen sticky top-0 border-r border-white/60 shadow-[0_8px_30px_rgba(15,23,42,0.08)] backdrop-blur-sm">
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
