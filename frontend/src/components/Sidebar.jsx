import React, { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  Building2, LayoutDashboard, Home, Users, DollarSign,
  Wrench, Menu, X, MapPin, ChevronRight, UserCircle2, Bell, RefreshCcw, DoorOpen, MessageCircle, ChevronDown, Landmark,
  Receipt, BarChart2, Star, BriefcaseBusiness, ClipboardList,
} from "lucide-react";

import api from "../utils/api";

const ownerLinks = [
  {
    section: "Dashboard & Overview",
    to: "/owner/dashboard",
    icon: LayoutDashboard,
    items: []
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
      { to: "/owner/expenses", label: "Expense Tracker", icon: Receipt },
      { to: "/owner/analytics", label: "Analytics & Tax", icon: BarChart2 },
      { to: "/owner/maintenance", label: "Maintenance", icon: Wrench },
    ]
  },
  {
    section: "Communication",
    items: [
      { to: "/owner/vendors", label: "Vendors", icon: BriefcaseBusiness },
      { to: "/owner/inquiries", label: "Inquiries", icon: MessageCircle },
      { to: "/owner/reviews", label: "Property Reviews", icon: Star },
      { to: "/owner/notifications", label: "Notifications", icon: Bell },
      { to: "/owner/profile", label: "My Profile", icon: UserCircle2 },
    ]
  },
];

const tenantLinks = [
  {
    section: "Dashboard",
    to: "/tenant/dashboard",
    icon: LayoutDashboard,    items: []
  },
  {
    section: "My Tenancy",
    items: [
      { to: "/tenant/rent", label: "Rent & Payments", icon: DollarSign },
      { to: "/tenant/maintenance", label: "My Requests", icon: Wrench },
      { to: "/tenant/reviews", label: "My Reviews", icon: Star },
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

const vendorLinks = [
  {
    section: "Dashboard",
    to: "/vendor/dashboard",
    icon: LayoutDashboard,
    items: [],
  },
  {
    section: "My Jobs",
    items: [
      { to: "/vendor/maintenance", label: "Assigned Requests", icon: ClipboardList },
    ],
  },
  {
    section: "Account",
    items: [
      { to: "/vendor/notifications", label: "Notifications", icon: Bell },
      { to: "/vendor/profile", label: "My Profile", icon: UserCircle2 },
    ],
  },
];

const Sidebar = () => {
  const location = useLocation();
  const { user } = useSelector((s) => s.auth);
  const isOwner = user?.role === "owner";
  const isVendor = user?.role === "vendor";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});
  const [activeInquiryCount, setActiveInquiryCount] = useState(0);

  useEffect(() => {
    if (!isOwner) return;
    api.get("/owner/inquiries").then(({ data }) => {
      const count = (data?.inquiries || []).filter((i) => i.status !== "Closed").length;
      setActiveInquiryCount(count);
    }).catch(() => {});
  }, [isOwner]);

  // Auto-expand the section that contains the currently active route
  useEffect(() => {
    const links = isOwner ? ownerLinks : isVendor ? vendorLinks : tenantLinks;
    links.forEach((section) => {
      if (section.items?.some((item) => location.pathname.startsWith(item.to))) {
        setExpandedSections((prev) => ({ ...prev, [section.section]: true }));
      }
    });
  }, [location.pathname, isOwner]);

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const links = isOwner ? ownerLinks : isVendor ? vendorLinks : tenantLinks;
  const brandPanelClass = isOwner
    ? "from-indigo-100 via-white to-blue-100 border-indigo-100"
    : isVendor
      ? "from-teal-50 via-white to-emerald-50 border-teal-100"
      : "from-emerald-50 via-white to-cyan-50 border-emerald-100";
  const brandIconClass = isOwner
    ? "from-indigo-600 to-blue-600"
    : isVendor
      ? "from-teal-600 to-emerald-600"
      : "from-emerald-600 to-cyan-600";
  const activeLinkClass = isOwner
    ? "bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-[0_10px_24px_rgba(79,70,229,0.35)]"
    : isVendor
      ? "bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-[0_10px_24px_rgba(13,148,136,0.35)]"
      : "bg-gradient-to-r from-emerald-600 to-cyan-600 text-white shadow-[0_10px_24px_rgba(5,150,105,0.35)]";
  const inactiveLinkClass = isOwner
    ? "text-slate-600 hover:bg-indigo-50 hover:text-indigo-700"
    : isVendor
      ? "text-slate-600 hover:bg-teal-50 hover:text-teal-700"
      : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-700";
  const apiOrigin = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "");
  const profilePictureUrl = user?.profilePictureUrl
    ? /^https?:\/\//i.test(user.profilePictureUrl)
      ? user.profilePictureUrl
      : user.profilePictureUrl.startsWith("/")
        ? `${apiOrigin}${user.profilePictureUrl}`
        : `${apiOrigin}/${user.profilePictureUrl}`
    : "";

  const sidebarContent = (
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
          {profilePictureUrl ? (
            <img
              src={profilePictureUrl}
              alt="Profile"
              className="w-9 h-9 rounded-full object-cover border border-white shadow-sm"
            />
          ) : (
            <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${brandIconClass} flex items-center justify-center text-white font-bold text-sm shadow-sm`}>
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">{user?.name}</p>
            {!isOwner ? <p className="text-xs text-slate-500 truncate">{user?.email}</p> : null}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="relative min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {links.map((section, idx) => {
          const isExpanded = expandedSections[section.section] === true;
          
          // Map section names to colors for owner
          const getSectionColors = (sectionName) => {
            if (sectionName === "Dashboard & Overview") 
              return { bg: "from-cyan-50 to-blue-50", border: "border-cyan-100", icon: "bg-cyan-500", header: "text-cyan-700", line: "from-cyan-300", activeBg: "bg-cyan-100", activeText: "text-cyan-700", activeBorder: "border-cyan-400" };
            if (sectionName === "Property Management") 
              return { bg: "from-indigo-50 to-purple-50", border: "border-indigo-100", icon: "bg-indigo-500", header: "text-indigo-700", line: "from-indigo-300", activeBg: "bg-indigo-100", activeText: "text-indigo-700", activeBorder: "border-indigo-400" };
            if (sectionName === "Lease Management") 
              return { bg: "from-violet-50 to-indigo-50", border: "border-violet-100", icon: "bg-violet-500", header: "text-violet-700", line: "from-violet-300", activeBg: "bg-violet-100", activeText: "text-violet-700", activeBorder: "border-violet-400" };
            if (sectionName === "Financial & Operations") 
              return { bg: "from-amber-50 to-yellow-50", border: "border-amber-100", icon: "bg-amber-500", header: "text-amber-700", line: "from-amber-300", activeBg: "bg-amber-100", activeText: "text-amber-700", activeBorder: "border-amber-400" };
            if (sectionName === "Communication") 
              return { bg: "from-rose-50 to-red-50", border: "border-rose-100", icon: "bg-rose-500", header: "text-rose-700", line: "from-rose-300", activeBg: "bg-rose-100", activeText: "text-rose-700", activeBorder: "border-rose-400" };
            
            // Tenant colors
            if (sectionName === "Dashboard") 
              return { bg: "from-cyan-50 to-blue-50", border: "border-cyan-100", icon: "bg-cyan-500", header: "text-cyan-700", line: "from-cyan-300", activeBg: "bg-cyan-100", activeText: "text-cyan-700", activeBorder: "border-cyan-400" };
            if (sectionName === "My Tenancy") 
              return { bg: "from-teal-50 to-emerald-50", border: "border-teal-100", icon: "bg-teal-500", header: "text-teal-700", line: "from-teal-300", activeBg: "bg-teal-100", activeText: "text-teal-700", activeBorder: "border-teal-400" };

            // Vendor colors
            if (sectionName === "My Jobs")
              return { bg: "from-teal-50 to-emerald-50", border: "border-teal-100", icon: "bg-teal-500", header: "text-teal-700", line: "from-teal-300", activeBg: "bg-teal-100", activeText: "text-teal-700", activeBorder: "border-teal-400" };
            if (sectionName === "Account")
              return { bg: "from-slate-50 to-gray-50", border: "border-slate-100", icon: "bg-slate-500", header: "text-slate-700", line: "from-slate-300", activeBg: "bg-slate-100", activeText: "text-slate-700", activeBorder: "border-slate-400" };
            
            return { bg: "from-sky-50 to-indigo-50", border: "border-sky-100", icon: "bg-sky-500", header: "text-sky-700", line: "from-sky-300", activeBg: "bg-sky-100", activeText: "text-sky-700", activeBorder: "border-sky-400" };
          };
          
          const colors = getSectionColors(section.section);

          if (section.to) {
            const SectionIcon = section.icon || LayoutDashboard;

            return (
              <div key={idx} className={idx > 0 ? "mt-4" : ""}>
                <NavLink
                  to={section.to}
                  onClick={(e) => {
                    if (location.pathname === section.to) {
                      e.preventDefault();
                      return;
                    }
                    setMobileOpen(false);
                  }}
                  preventScrollReset
                  className={({ isActive }) =>
                    `w-full px-3 py-2.5 rounded-lg border transition-all duration-200 flex items-center gap-2.5 group ${
                      isActive
                        ? `bg-gradient-to-r ${colors.bg} ${colors.border} shadow-md`
                        : `bg-white/75 border-white/70 hover:shadow-md hover:scale-105`
                    }`
                  }
                >
                  <div className={`p-1.5 rounded-md ${colors.icon} flex-shrink-0`}>
                    <SectionIcon size={16} className="text-white" />
                  </div>
                  <span className={`flex-1 text-left text-xs font-bold tracking-wide ${colors.header}`}>{section.section}</span>
                  <ChevronRight size={14} className="opacity-50 transition-transform duration-200 group-hover:translate-x-0.5" />
                </NavLink>
              </div>
            );
          }
          
          return (
            <div key={idx} className={idx > 0 ? "mt-4" : ""}>
              {/* Section Header - Clickable with Gradient */}
              <button
                onClick={() => toggleSection(section.section)}
                className={`w-full px-3 py-2.5 mb-2 rounded-lg bg-gradient-to-r ${colors.bg} border ${colors.border} transition-all duration-200 flex items-center gap-2.5 group hover:shadow-md hover:scale-105 transform`}
              >
                <div className={`p-1.5 rounded-md ${colors.icon} flex-shrink-0`}>
                  <ChevronDown 
                    size={16} 
                    className={`text-white transition-transform duration-300 ${isExpanded ? "rotate-0" : "-rotate-90"}`} 
                  />
                </div>
                <span className={`flex-1 text-left text-xs font-bold tracking-wide ${colors.header}`}>{section.section}</span>
              </button>
              
              {/* Section Items - Collapsible */}
              <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                }`}
              >
                <div className="space-y-1.5 pl-1">
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
                        `group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 border-l-3 ${
                          isActive
                            ? `${colors.activeBorder} ${colors.activeBg} ${colors.activeText}`
                            : `border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-700`
                        }`
                      }
                    >
                      <Icon size={18} className="transition-transform duration-200 group-hover:scale-110 flex-shrink-0" />
                      <span className="flex-1">{label}</span>
                      {isOwner && to === "/owner/inquiries" && activeInquiryCount > 0 ? (
                        <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">{activeInquiryCount}</span>
                      ) : (
                        <ChevronRight size={14} className="opacity-40 transition-transform duration-200 group-hover:translate-x-0.5 flex-shrink-0" />
                      )}
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
        {sidebarContent}
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-72 h-screen sticky top-0 border-r border-white/70 shadow-[0_8px_30px_rgba(15,23,42,0.10)] backdrop-blur-sm">
        {sidebarContent}
      </aside>
    </>
  );
};

export default Sidebar;
