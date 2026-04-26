import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  Users,
  Wrench,
  Phone,
  Mail,
  Plus,
  CheckCircle2,
  Clock3,
  XCircle,
  BadgeCheck,
  LogOut,
  X,
  Building2,
  MapPin,
  StickyNote,
  LayoutDashboard,
  UserCheck,
  HomeIcon,
  TrendingUp,
  Filter,
} from "lucide-react";
import api from "../../utils/api";
import toast from "react-hot-toast";
import { logout } from "../../app/slices/authSlice";

const CATEGORIES = ["Electric", "Plumbing", "General", "Carpentry", "Painting", "Other"];
const LEAD_STATUS_OPTIONS = ["All", "New", "Contacted", "Approved", "Rejected"];

const leadStatusClass = (status) => {
  if (status === "Approved") return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (status === "Rejected") return "bg-rose-100 text-rose-700 border-rose-200";
  if (status === "Contacted") return "bg-blue-100 text-blue-700 border-blue-200";
  return "bg-amber-100 text-amber-700 border-amber-200";
};

const emptyVendorForm = {
  name: "",
  phone: "",
  email: "",
  city: "",
  specializations: ["General"],
  notes: "",
};

const AdminDashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [vendors, setVendors] = useState([]);
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [saving, setSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [vendorForm, setVendorForm] = useState(emptyVendorForm);
  const [insightType, setInsightType] = useState("owners");
  const [insightItems, setInsightItems] = useState([]);
  const [insightLoading, setInsightLoading] = useState(false);

  // Filters
  const [vendorCategoryFilter, setVendorCategoryFilter] = useState("All");
  const [leadStatusFilter, setLeadStatusFilter] = useState("All");

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  const loadInsightList = async (type) => {
    setInsightType(type);
    setInsightLoading(true);
    try {
      const res = await api.get(`/admin/insights?type=${type}`);
      setInsightItems(res.data.items || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load details.");
    } finally {
      setInsightLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      const [vendorRes, leadRes, statsRes] = await Promise.all([
        api.get("/admin/vendors"),
        api.get("/admin/vendor-leads"),
        api.get("/admin/stats"),
      ]);
      setVendors(vendorRes.data.vendors || []);
      setLeads(leadRes.data.leads || []);
      setStats(statsRes.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load admin data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    loadInsightList("owners");
  }, []);

  const createVendor = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/admin/vendors", vendorForm);
      toast.success("Vendor added to directory.");
      setVendorForm(emptyVendorForm);
      setShowAddModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add vendor.");
    } finally {
      setSaving(false);
    }
  };

  const deactivateVendor = async (id) => {
    if (!window.confirm("Deactivate this vendor from directory?")) return;
    try {
      await api.delete(`/admin/vendors/${id}`);
      toast.success("Vendor deactivated.");
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to deactivate vendor.");
    }
  };

  const updateLeadStatus = async (leadId, status) => {
    try {
      const res = await api.patch(`/admin/vendor-leads/${leadId}/status`, { status });
      setLeads((prev) => prev.map((lead) => (lead._id === leadId ? { ...lead, status } : lead)));
      if (status === "Approved") {
        const credentials = res.data?.provisioning?.credentials;
        if (credentials?.email && credentials?.defaultPassword) {
          toast.success(
            `Lead approved. Vendor login created for ${credentials.email}. Default password: ${credentials.defaultPassword}`
          );
        } else {
          toast.success("Lead approved — vendor added to directory.");
        }
        const syncedVendor = res.data?.vendor;
        if (syncedVendor) {
          setVendors((prev) => {
            const exists = prev.some((v) => v._id === syncedVendor._id);
            if (exists) {
              return prev.map((v) => (v._id === syncedVendor._id ? syncedVendor : v));
            }
            return [syncedVendor, ...prev];
          });
        }
        setVendorCategoryFilter("All");
        setActiveTab("vendors");
        fetchData(); // authoritative refresh
      } else {
        toast.success("Lead status updated.");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update status.");
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-gray-500">Loading admin console…</p>
        </div>
      </div>
    );

  const newLeads = leads.filter((l) => l.status === "New").length;
  const activeVendors = vendors.filter((v) => v.isActive !== false).length;

  const filteredVendors =
    vendorCategoryFilter === "All"
      ? vendors
      : vendors.filter((v) => (v.specializations || []).includes(vendorCategoryFilter));

  const filteredLeads =
    leadStatusFilter === "All" ? leads : leads.filter((l) => l.status === leadStatusFilter);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* ── Top Navigation Bar ─────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-indigo-100 bg-white/80 backdrop-blur-md shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-600 text-white shadow">
              <LayoutDashboard size={18} />
            </div>
            <div>
              <p className="text-sm font-extrabold text-gray-900 leading-none">Admin Console</p>
              <p className="text-xs text-gray-400">PropManager</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold text-sm px-3.5 py-2 transition-colors"
          >
            <LogOut size={15} /> <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* ── Hero Banner ────────────────────────────────────── */}
        <div className="rounded-3xl bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 p-6 lg:p-8 text-white shadow-xl overflow-hidden relative">
          <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full bg-white/5 pointer-events-none" />
          <div className="relative">
            <p className="text-xs uppercase tracking-[0.18em] text-indigo-300 font-semibold">Platform Overview</p>
            <h1 className="mt-2 text-2xl lg:text-3xl font-extrabold leading-tight">Admin Operations Dashboard</h1>
            <p className="mt-2 text-sm text-blue-200 max-w-2xl">
              Monitor platform activity, manage the vendor directory, and process vendor partnership leads.
            </p>
          </div>
        </div>

        {/* ── Stats Cards ────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { label: "Owners", value: stats?.totalOwners ?? "—", icon: UserCheck, bg: "bg-indigo-50", text: "text-indigo-600", border: "border-indigo-100", detailType: "owners" },
            { label: "Tenants", value: stats?.totalTenants ?? "—", icon: Users, bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-100", detailType: "tenants" },
            { label: "Properties", value: stats?.totalProperties ?? "—", icon: HomeIcon, bg: "bg-violet-50", text: "text-violet-600", border: "border-violet-100", detailType: "properties" },
            { label: "Active Vendors", value: activeVendors, icon: Wrench, bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-100" },
            { label: "New Leads", value: newLeads, icon: TrendingUp, bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-100" },
          ].map(({ label, value, icon: Icon, bg, text, border, detailType: listType }) => (
            <button
              key={label}
              type="button"
              onClick={() => {
                if (!listType) return;
                setActiveTab("overview");
                loadInsightList(listType);
              }}
              className={`rounded-2xl border ${border} ${bg} p-4 flex flex-col gap-2 text-left ${listType ? "hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer" : "cursor-default"}`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${bg}`}>
                <Icon size={18} className={text} />
              </div>
              <p className="text-2xl font-extrabold text-gray-900">{value}</p>
              <p className={`text-xs font-semibold ${text}`}>
                {label}
                {listType && <span className="ml-1 text-[10px] opacity-80">View list</span>}
              </p>
            </button>
          ))}
        </div>

        {/* ── Tab Bar ─────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-2 rounded-2xl border border-gray-200 bg-white p-1.5 w-fit shadow-sm">
          {[
            { key: "overview", label: "Overview", icon: TrendingUp },
            { key: "vendors", label: "Vendor Directory", icon: ShieldCheck },
            { key: "leads", label: "Vendor Leads", icon: Users, badge: newLeads },
          ].map(({ key, label, icon: Icon, badge }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === key
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                  : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
              }`}
            >
              <Icon size={15} /> {label}
              {badge > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-400 text-amber-900 text-[10px] font-bold">
                  {badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Overview Tab ────────────────────────────────────── */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* User Breakdown */}
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 bg-gray-50/60">
                <Users size={16} className="text-indigo-500" />
                <h2 className="font-bold text-gray-900">Registered Users</h2>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between rounded-2xl bg-indigo-50 border border-indigo-100 px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                      <UserCheck size={18} className="text-indigo-600" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">Property Owners</p>
                      <p className="text-xs text-gray-500">Registered as owner</p>
                    </div>
                  </div>
                  <p className="text-3xl font-extrabold text-indigo-600">{stats?.totalOwners ?? "—"}</p>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-blue-50 border border-blue-100 px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                      <Users size={18} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">Tenants</p>
                      <p className="text-xs text-gray-500">Registered as tenant</p>
                    </div>
                  </div>
                  <p className="text-3xl font-extrabold text-blue-600">{stats?.totalTenants ?? "—"}</p>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 border border-slate-100 px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                      <ShieldCheck size={18} className="text-slate-600" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">Total Users</p>
                      <p className="text-xs text-gray-500">Owners + Tenants</p>
                    </div>
                  </div>
                  <p className="text-3xl font-extrabold text-gray-700">
                    {stats ? (stats.totalOwners + stats.totalTenants) : "—"}
                  </p>
                </div>
                {/* Simple visual bar */}
                {stats && (stats.totalOwners + stats.totalTenants) > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-gray-500 font-medium">
                      <span>Owners</span><span>Tenants</span>
                    </div>
                    <div className="h-3 rounded-full bg-blue-100 overflow-hidden flex">
                      <div
                        className="h-full bg-indigo-500 rounded-l-full"
                        style={{ width: `${(stats.totalOwners / (stats.totalOwners + stats.totalTenants)) * 100}%` }}
                      />
                      <div className="h-full bg-blue-400 flex-1 rounded-r-full" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Vendor & Lead Summary */}
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 bg-gray-50/60">
                <Wrench size={16} className="text-indigo-500" />
                <h2 className="font-bold text-gray-900">Vendor Summary</h2>
              </div>
              <div className="p-5 space-y-3">
                {[
                  { label: "Active Vendors", value: activeVendors, sub: "In app directory", color: "emerald" },
                  { label: "Total Leads", value: leads.length, sub: "Partnership requests", color: "blue" },
                  { label: "New Leads", value: newLeads, sub: "Awaiting review", color: "amber" },
                  { label: "Approved Leads", value: leads.filter((l) => l.status === "Approved").length, sub: "Added to directory", color: "indigo" },
                ].map(({ label, value, sub, color }) => (
                  <div key={label} className={`flex items-center justify-between px-4 py-3 rounded-xl bg-${color}-50 border border-${color}-100`}>
                    <div>
                      <p className={`font-semibold text-gray-900 text-sm`}>{label}</p>
                      <p className={`text-xs text-${color}-600`}>{sub}</p>
                    </div>
                    <p className={`text-2xl font-extrabold text-${color}-600`}>{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "overview" && (
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/60">
              <h2 className="font-bold text-gray-900">Admin Insights</h2>
              <p className="text-xs text-gray-500 mt-1">Use the left sidebar to switch between Owners, Tenants, and Properties.</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[420px]">
              <aside className="lg:col-span-3 border-r border-gray-100 bg-gray-50/50 p-3 space-y-2">
                {[
                  { key: "owners", label: "Owners", count: stats?.totalOwners ?? 0, icon: UserCheck },
                  { key: "tenants", label: "Tenants", count: stats?.totalTenants ?? 0, icon: Users },
                  { key: "properties", label: "Properties", count: stats?.totalProperties ?? 0, icon: HomeIcon },
                ].map(({ key, label, count, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => loadInsightList(key)}
                    className={`w-full flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all ${
                      insightType === key
                        ? "bg-indigo-600 text-white border-indigo-600 shadow"
                        : "bg-white text-gray-700 border-gray-200 hover:border-indigo-300 hover:text-indigo-600"
                    }`}
                  >
                    <span className="inline-flex items-center gap-2">
                      <Icon size={14} /> {label}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${insightType === key ? "bg-white/20" : "bg-gray-100 text-gray-600"}`}>
                      {count}
                    </span>
                  </button>
                ))}
              </aside>

              <div className="lg:col-span-9 p-5">
                {insightLoading ? (
                  <div className="py-16 text-center text-sm text-gray-500">Loading {insightType}...</div>
                ) : insightItems.length === 0 ? (
                  <div className="py-16 text-center text-sm text-gray-500">No records found.</div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-gray-200">
                    {insightType === "properties" ? (
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-600">
                          <tr>
                            <th className="text-left px-4 py-3 font-semibold">Type</th>
                            <th className="text-left px-4 py-3 font-semibold">City</th>
                            <th className="text-left px-4 py-3 font-semibold">Status</th>
                            <th className="text-left px-4 py-3 font-semibold">Owner</th>
                            <th className="text-left px-4 py-3 font-semibold">Created</th>
                          </tr>
                        </thead>
                        <tbody>
                          {insightItems.map((item) => (
                            <tr key={item._id} className="border-t border-gray-100">
                              <td className="px-4 py-3 text-gray-800 font-medium">{item.propertyType || "N/A"}</td>
                              <td className="px-4 py-3 text-gray-600">{item.address?.city || "N/A"}</td>
                              <td className="px-4 py-3 text-gray-600">{item.status || "N/A"}</td>
                              <td className="px-4 py-3 text-gray-600">{item.owner?.name || item.owner?.email || "N/A"}</td>
                              <td className="px-4 py-3 text-gray-500">{new Date(item.createdAt).toLocaleDateString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-600">
                          <tr>
                            <th className="text-left px-4 py-3 font-semibold">Name</th>
                            <th className="text-left px-4 py-3 font-semibold">Email</th>
                            <th className="text-left px-4 py-3 font-semibold">Role</th>
                            <th className="text-left px-4 py-3 font-semibold">Joined</th>
                          </tr>
                        </thead>
                        <tbody>
                          {insightItems.map((item) => (
                            <tr key={item._id} className="border-t border-gray-100">
                              <td className="px-4 py-3 text-gray-800 font-medium">{item.name || "N/A"}</td>
                              <td className="px-4 py-3 text-gray-600">{item.email || "N/A"}</td>
                              <td className="px-4 py-3 text-gray-600 capitalize">{item.role || insightType.slice(0, -1)}</td>
                              <td className="px-4 py-3 text-gray-500">{new Date(item.createdAt).toLocaleDateString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Vendor Directory Tab ────────────────────────────── */}
        {activeTab === "vendors" && (
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            {/* Section header */}
            <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-gray-100 bg-gray-50/60">
              <div className="flex items-center gap-2">
                <Wrench size={16} className="text-indigo-500" />
                <h2 className="font-bold text-gray-900">Vendor Directory</h2>
                <span className="ml-1 px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold">
                  {filteredVendors.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => { setVendorForm(emptyVendorForm); setShowAddModal(true); }}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm px-4 py-2 shadow transition-colors"
              >
                <Plus size={15} /> Add Vendor
              </button>
            </div>

            {/* Category filter tiles */}
            <div className="flex flex-wrap items-center gap-2 px-5 py-3 border-b border-gray-100 bg-white">
              <Filter size={13} className="text-gray-400 shrink-0" />
              {["All", ...CATEGORIES].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setVendorCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                    vendorCategoryFilter === cat
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                      : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Vendor list */}
            <div className="p-5">
              {filteredVendors.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-3">
                    <Wrench size={24} className="text-indigo-400" />
                  </div>
                  <p className="text-sm font-semibold text-gray-700">
                    {vendorCategoryFilter === "All" ? "No vendors yet" : `No vendors for "${vendorCategoryFilter}"`}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {vendorCategoryFilter === "All" ? 'Click "Add Vendor" to add the first entry.' : "Try a different category filter."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredVendors.map((v) => (
                    <div
                      key={v._id}
                      className="rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow p-4 flex flex-col gap-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                            <Wrench size={18} className="text-indigo-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-gray-900 text-sm truncate">{v.name}</p>
                            {v.city && (
                              <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                <MapPin size={10} className="shrink-0" /> {v.city}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full border ${v.isActive !== false ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-100 text-gray-500 border-gray-200"}`}>
                          {v.isActive !== false ? "Active" : "Inactive"}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {(v.specializations || ["General"]).map((s) => (
                          <span key={s} className="px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-100">
                            {s}
                          </span>
                        ))}
                      </div>

                      <div className="text-xs text-gray-600 space-y-1.5 border-t border-gray-100 pt-3">
                        <p className="flex items-center gap-1.5"><Phone size={12} className="text-indigo-400 shrink-0" /> {v.phone}</p>
                        {v.email && <p className="flex items-center gap-1.5"><Mail size={12} className="text-indigo-400 shrink-0" /> {v.email}</p>}
                        {v.notes && <p className="flex items-start gap-1.5 text-gray-400"><StickyNote size={12} className="mt-0.5 shrink-0" /> {v.notes}</p>}
                      </div>

                      <button
                        type="button"
                        onClick={() => deactivateVendor(v._id)}
                        className="mt-auto w-full rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 text-xs font-semibold text-rose-700 transition-colors"
                      >
                        Deactivate
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Vendor Leads Tab ────────────────────────────────── */}
        {activeTab === "leads" && (
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 bg-gray-50/60">
              <Users size={16} className="text-indigo-500" />
              <h2 className="font-bold text-gray-900">Vendor Leads</h2>
              <span className="ml-1 px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold">
                {filteredLeads.length}
              </span>
            </div>

            {/* Status filter tiles */}
            <div className="flex flex-wrap items-center gap-2 px-5 py-3 border-b border-gray-100 bg-white">
              <Filter size={13} className="text-gray-400 shrink-0" />
              {LEAD_STATUS_OPTIONS.map((s) => {
                const count = s === "All" ? leads.length : leads.filter((l) => l.status === s).length;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setLeadStatusFilter(s)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                      leadStatusFilter === s
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                        : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600"
                    }`}
                  >
                    {s}
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${leadStatusFilter === s ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="p-5">
              {filteredLeads.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-3">
                    <Users size={24} className="text-indigo-400" />
                  </div>
                  <p className="text-sm font-semibold text-gray-700">
                    {leadStatusFilter === "All" ? "No vendor leads yet" : `No "${leadStatusFilter}" leads`}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {leadStatusFilter === "All" ? "Leads from the landing page will appear here." : "Try a different status filter."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {filteredLeads.map((lead) => (
                    <div key={lead._id} className="rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                          <p className="font-bold text-gray-900">{lead.companyName}</p>
                          <p className="text-xs text-gray-500 mt-0.5">Contact: {lead.contactName}</p>
                          {lead.city && (
                            <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                              <MapPin size={10} className="shrink-0" /> {lead.city}
                            </p>
                          )}
                        </div>
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${leadStatusClass(lead.status)}`}>
                          {lead.status === "Approved" && <BadgeCheck size={12} />}
                          {lead.status === "Rejected" && <XCircle size={12} />}
                          {lead.status === "Contacted" && <Clock3 size={12} />}
                          {lead.status === "New" && <CheckCircle2 size={12} />}
                          {lead.status}
                        </span>
                      </div>

                      {(lead.specializations || []).length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {lead.specializations.map((s) => (
                            <span key={s} className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-100">{s}</span>
                          ))}
                        </div>
                      )}

                      <div className="text-xs text-gray-600 space-y-1 border-t border-gray-100 pt-3">
                        <p className="flex items-center gap-1.5"><Phone size={12} className="text-indigo-400 shrink-0" /> {lead.phone}</p>
                        <p className="flex items-center gap-1.5"><Mail size={12} className="text-indigo-400 shrink-0" /> {lead.email}</p>
                      </div>

                      {lead.message && (
                        <p className="text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2 border border-gray-100 leading-relaxed">
                          {lead.message}
                        </p>
                      )}

                      <div className="pt-1">
                        <label className="text-xs font-semibold text-gray-500 block mb-1">Update Status</label>
                        <select
                          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
                          value={lead.status}
                          onChange={(e) => updateLeadStatus(lead._id, e.target.value)}
                        >
                          {["New", "Contacted", "Approved", "Rejected"].map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Add Vendor Modal ─────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-blue-50">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-100 text-indigo-600"><Plus size={16} /></div>
                <div>
                  <h3 className="font-bold text-gray-900">Add Vendor</h3>
                  <p className="text-xs text-gray-500">New entry to the app vendor directory</p>
                </div>
              </div>
              <button type="button" onClick={() => setShowAddModal(false)} className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={createVendor} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-gray-500 block mb-1">Vendor Name *</label>
                  <div className="relative">
                    <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10" />
                    <input
                      required
                      className="input-field"
                      style={{ paddingLeft: "2rem" }}
                      placeholder="e.g. Ramesh Electrical Works"
                      value={vendorForm.name}
                      onChange={(e) => setVendorForm((prev) => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1">Phone *</label>
                  <div className="relative">
                    <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10" />
                    <input
                      required
                      className="input-field"
                      style={{ paddingLeft: "2rem" }}
                      placeholder="Phone number"
                      value={vendorForm.phone}
                      onChange={(e) => setVendorForm((prev) => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1">Email</label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10" />
                    <input
                      className="input-field"
                      style={{ paddingLeft: "2rem" }}
                      placeholder="Email"
                      value={vendorForm.email}
                      onChange={(e) => setVendorForm((prev) => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-gray-500 block mb-1">City</label>
                  <div className="relative">
                    <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10" />
                    <input
                      className="input-field"
                      style={{ paddingLeft: "2rem" }}
                      placeholder="City"
                      value={vendorForm.city}
                      onChange={(e) => setVendorForm((prev) => ({ ...prev, city: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-2">Specializations</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((c) => {
                    const active = vendorForm.specializations.includes(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          setVendorForm((prev) => {
                            const next = prev.specializations.includes(c)
                              ? prev.specializations.filter((x) => x !== c)
                              : [...prev.specializations, c];
                            return { ...prev, specializations: next.length ? next : ["General"] };
                          });
                        }}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors ${
                          active ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300"
                        }`}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1">Notes</label>
                <textarea
                  rows={3}
                  className="input-field"
                  placeholder="Coverage area, team size, working hours…"
                  value={vendorForm.notes}
                  onChange={(e) => setVendorForm((prev) => ({ ...prev, notes: e.target.value }))}
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm px-4 py-2.5 disabled:opacity-60 shadow transition-colors"
                >
                  <Plus size={15} /> {saving ? "Saving…" : "Add Vendor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
