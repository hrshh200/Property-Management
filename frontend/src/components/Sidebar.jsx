import React, { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  Building2, LayoutDashboard, Home, Users, DollarSign,
  Wrench, Menu, X, MapPin, ChevronRight, UserCircle2, Bell, RefreshCcw, DoorOpen, MessageCircle, ChevronDown, Landmark,
} from "lucide-react";

const ownerLinks = [
  {
    section: "Dashboard & Overview",
    items: [
      { to: "/owner/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ]
  },
  {
    section: "Property Management",
    items: [
      { to: "/owner/properties", label: "Properties", icon: Home },
      { to: "/owner/tenants", label: "Tenants & Leases", icon: Users },
      { to: "/owner/vacancies", label: "Vacancies", icon: MapPin },
    ]
  },
  {
    section: "Lease Management",
    items: [
      { to: "/owner/renewals", label: "Lease Renewals", icon: RefreshCcw },
      { to: "/owner/move-out", label: "Move-Out Requests", icon: DoorOpen },
    ]
  },
  {
    section: "Financial & Operations",
    items: [
      { to: "/owner/rent", label: "Rent Management", icon: DollarSign },
      { to: "/owner/payment-details", label: "Payment Details", icon: Landmark },
      { to: "/owner/maintenance", label: "Maintenance", icon: Wrench },
    ]
  },
  {
    section: "Communication",
    items: [
      { to: "/owner/inquiries", label: "Inquiries", icon: MessageCircle },
      { to: "/owner/notifications", label: "Notifications", icon: Bell },
      { to: "/owner/profile", label: "My Profile", icon: UserCircle2 },
    ]
  },
];

const tenantLinks = [
  {
    section: "Dashboard",
    items: [
      { to: "/tenant/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ]
  },
  {
    section: "My Tenancy",
    items: [
      { to: "/tenant/rent", label: "Rent & Payments", icon: DollarSign },
      { to: "/tenant/maintenance", label: "My Requests", icon: Wrench },
    ]
  },
  {
    section: "Communication",
    items: [
      { to: "/tenant/inquiries", label: "Inquiries", icon: MessageCircle },
      { to: "/tenant/notifications", label: "Notifications", icon: Bell },
      { to: "/tenant/profile", label: "My Profile", icon: UserCircle2 },
    ]
  },
];

const Sidebar = () => {
  const location = useLocation();
  const { user } = useSelector((s) => s.auth);
  const isOwner = user?.role === "owner";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const links = user?.role === "owner" ? ownerLinks : tenantLinks;
  const brandPanelClass = isOwner
    ? "from-indigo-100 via-white to-blue-100 border-indigo-100"
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

  const SidebarContent = () => (
    <div className={`relative flex flex-col h-full overflow-hidden bg-gradient-to-b ${brandPanelClass}`}>
      <div className="pointer-events-none absolute -top-14 -left-10 h-44 w-44 rounded-full bg-white/50 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-40 w-40 rounded-full bg-slate-200/30 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.45),transparent_35%)]" />

      {/* Logo */}
      <div className="relative flex items-center gap-3 px-6 py-5 border-b border-white/60">
        <div className={`p-2 rounded-xl bg-gradient-to-br ${brandIconClass} shadow-lg`}>
          <Building2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-extrabold text-slate-900 text-sm tracking-wide">PropManager</p>
          <div className="mt-0.5 inline-flex items-center gap-1 rounded-full border border-white/70 bg-white/70 px-2 py-0.5">
            <span className={`h-1.5 w-1.5 rounded-full ${isOwner ? "bg-indigo-500" : "bg-emerald-500"}`} />
            <p className="text-[10px] font-semibold text-slate-600 capitalize">{user?.role} Portal</p>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="relative px-5 py-4 border-b border-white/60">
        <div className="flex items-center gap-3 rounded-2xl border border-white/80 bg-white/80 p-3 backdrop-blur-sm shadow-sm">
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
      <nav className="relative min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {links.map((section, idx) => {
          const isExpanded = expandedSections[section.section] === true;
          
          return (
            <div key={idx} className={idx > 0 ? "mt-3" : ""}>
              {/* Section Header - Clickable */}
              <button
                onClick={() => toggleSection(section.section)}
                className="w-full px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-2 group"
              >
                <ChevronDown 
                  size={14} 
                  className={`transition-transform duration-300 ${isExpanded ? "rotate-0" : "-rotate-90"}`} 
                />
                <span className="flex-1 text-left">{section.section}</span>
                <span className="flex-1 h-px bg-gradient-to-r from-slate-300 to-transparent" />
              </button>
              
              {/* Section Items - Collapsible */}
              <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                }`}
              >
                <div className="space-y-1.5 mt-1.5">
                  {section.items.map(({ to, label, icon: Icon }) => (
                    <NavLink
                      key={to}
                      to={to}
                      onClick={(e) => {
                        if (location.pathname === to) {
                          e.preventDefault();
                          return;
                        }
                        setMobileOpen(false);
                      }}
                      preventScrollReset
                      className={({ isActive }) =>
                        `group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
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
                </div>
              </div>
            </div>
          );
        })}
      </nav>
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
      <aside className="hidden lg:flex flex-col w-72 h-screen sticky top-0 border-r border-white/70 shadow-[0_8px_30px_rgba(15,23,42,0.10)] backdrop-blur-sm">
        <SidebarContent />
      </aside>
    </>
  );
};

export default Sidebar;
