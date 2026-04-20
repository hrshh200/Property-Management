import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  Users,
  DollarSign,
  Wrench,
  MapPin,
  TrendingUp,
  Wallet,
  AlertTriangle,
  ClipboardList,
  ArrowUpRight,
  Home,
  CircleDollarSign,
  ShieldAlert,
  BellRing,
  Clock3,
  Siren,
  ScrollText,
  ShieldCheck,
  FileText,
  Download,
  Mail,
  Phone,
  MessageCircle,
  Sparkles,
  Rocket,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { PageHeader } from "../../components/UI";
import api from "../../utils/api";
import { formatCurrency } from "../../utils/currency";
import toast from "react-hot-toast";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

const MetricCard = ({ title, value, subtitle, icon: Icon, accent = "blue" }) => {
  const accentMap = {
    blue: "from-blue-500 to-indigo-500",
    green: "from-emerald-500 to-green-500",
    amber: "from-amber-500 to-orange-500",
    rose: "from-rose-500 to-red-500",
    violet: "from-violet-500 to-purple-500",
    slate: "from-slate-500 to-slate-600",
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white/95 p-5 shadow-[0_10px_28px_rgba(15,23,42,0.08)] hover:shadow-[0_16px_36px_rgba(59,130,246,0.18)] transition-all duration-300">
      <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-blue-50/90" />
      <div className="absolute -left-8 -bottom-8 h-16 w-16 rounded-full bg-indigo-50/80" />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{title}</p>
          <p className="mt-2 text-3xl font-extrabold text-gray-900">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-gray-500">{subtitle}</p>}
        </div>
        <div className={`rounded-xl bg-gradient-to-br p-2.5 text-white shadow-lg ${accentMap[accent] || accentMap.blue}`}>
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
};

const ProgressStat = ({ label, value, tone = "blue", icon: Icon, helper }) => {
  const clamped = Math.max(0, Math.min(100, value || 0));
  const toneMap = {
    blue: "bg-blue-500",
    green: "bg-green-500",
    amber: "bg-amber-500",
    red: "bg-red-500",
  };
  const iconToneMap = {
    blue: "bg-blue-100 text-blue-600",
    green: "bg-green-100 text-green-600",
    amber: "bg-amber-100 text-amber-600",
    red: "bg-red-100 text-red-600",
  };

  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className={`mt-0.5 rounded-lg p-1.5 ${iconToneMap[tone] || iconToneMap.blue}`}>
            {Icon ? <Icon size={14} /> : null}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">{label}</p>
            {helper && <p className="text-xs text-gray-500">{helper}</p>}
          </div>
        </div>
        <span className="text-sm font-bold text-gray-900">{clamped.toFixed(0)}%</span>
      </div>
      <div className="h-2 rounded-full bg-gray-100">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${toneMap[tone] || toneMap.blue}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
};

const OwnerDashboard = () => {
  const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "");
  const navigate = useNavigate();
  
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [recentComplianceDocs, setRecentComplianceDocs] = useState([]);
  const [recentInquiries, setRecentInquiries] = useState([]);
  const [updatingInquiryId, setUpdatingInquiryId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [{ data }, { data: leaseData }, { data: rentData }, { data: maintenanceData }, { data: complianceData }, { data: analyticsData }, { data: inquiryData }] = await Promise.all([
          api.get("/owner/dashboard"),
          api.get("/owner/leases"),
          api.get("/owner/rent"),
          api.get("/owner/maintenance"),
          api.get("/owner/compliance-documents"),
          api.get("/owner/analytics"),
          api.get("/owner/inquiries"),
        ]);

        setStats(data.stats);
        setAnalytics(analyticsData.analytics || null);

        const today = new Date();
        const within30Days = new Date();
        within30Days.setDate(today.getDate() + 30);
        const within7Days = new Date();
        within7Days.setDate(today.getDate() + 7);

        const leases = leaseData?.leases || [];
        const rents = rentData?.rents || [];
        const requests = maintenanceData?.requests || [];
        const documents = complianceData?.documents || [];
        const inquiries = inquiryData?.inquiries || [];

        const expiringLeases = leases.filter((lease) => {
          const endDate = new Date(lease.leaseEndDate);
          return endDate >= today && endDate <= within30Days;
        });

        const overdueRents = rents.filter((rent) => rent.status === "Overdue");
        const dueSoonRents = rents.filter((rent) => {
          if (rent.status !== "Pending") return false;
          const dueDate = new Date(rent.dueDate);
          return dueDate >= today && dueDate <= within7Days;
        });

        const emergencyRequests = requests.filter((req) =>
          ["Open", "In Progress"].includes(req.status) && ["Emergency", "High"].includes(req.urgency)
        );

        const nextAlerts = [];

        if (overdueRents.length > 0) {
          const overdueAmount = overdueRents.reduce((sum, rent) => sum + Number(rent.amount || 0), 0);
          nextAlerts.push({
            id: "overdue-rent",
            tone: "red",
            icon: Siren,
            title: `${overdueRents.length} overdue rent record${overdueRents.length > 1 ? "s" : ""}`,
            detail: `${formatCurrency(overdueAmount)} requires immediate follow-up.`,
            actionLabel: "View Rent",
            onAction: () => navigate("/owner/rent"),
          });
        }

        if (expiringLeases.length > 0) {
          nextAlerts.push({
            id: "expiring-leases",
            tone: "amber",
            icon: ScrollText,
            title: `${expiringLeases.length} lease${expiringLeases.length > 1 ? "s" : ""} ending in 30 days`,
            detail: "Prepare renewals or occupancy planning before end dates.",
            actionLabel: "Open Leases",
            onAction: () => navigate("/owner/tenants"),
          });
        }

        if (dueSoonRents.length > 0) {
          nextAlerts.push({
            id: "due-soon-rent",
            tone: "blue",
            icon: Clock3,
            title: `${dueSoonRents.length} rent payment${dueSoonRents.length > 1 ? "s are" : " is"} due within 7 days`,
            detail: "Send reminders early to improve collection rates.",
            actionLabel: "Check Due Rent",
            onAction: () => navigate("/owner/rent"),
          });
        }

        if (emergencyRequests.length > 0) {
          nextAlerts.push({
            id: "urgent-maintenance",
            tone: "violet",
            icon: BellRing,
            title: `${emergencyRequests.length} high-priority maintenance request${emergencyRequests.length > 1 ? "s" : ""}`,
            detail: "Urgent tenant issues are waiting for action.",
            actionLabel: "Open Maintenance",
            onAction: () => navigate("/owner/maintenance"),
          });
        }

        const tenantUploadedRecently = documents.filter((doc) => {
          if (doc.uploadedByRole !== "tenant") return false;
          const uploadedAt = new Date(doc.createdAt);
          const daysDiff = (today.getTime() - uploadedAt.getTime()) / (1000 * 60 * 60 * 24);
          return daysDiff <= 7;
        });

        if (tenantUploadedRecently.length > 0) {
          nextAlerts.push({
            id: "tenant-docs",
            tone: "blue",
            icon: ShieldCheck,
            title: `${tenantUploadedRecently.length} new tenant compliance upload${tenantUploadedRecently.length > 1 ? "s" : ""}`,
            detail: "Review recently uploaded rent agreement/KYC documents.",
            actionLabel: "Open Leases",
            onAction: () => navigate("/owner/tenants"),
          });
        }

        setRecentComplianceDocs(documents.slice(0, 6));
        setRecentInquiries(inquiries.slice(0, 6));

        setAlerts(nextAlerts);
      } catch {
        toast.error("Failed to load dashboard.");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading dashboard...</div>;

  const pieData = stats
    ? [
        { name: "Occupied", value: stats.occupiedProperties },
        { name: "Vacant", value: stats.vacantProperties },
      ]
    : [];

  const rentData = stats
    ? [
        { name: "Paid", value: stats.totalPaidAmount, fill: "#10b981" },
        { name: "Pending", value: stats.pendingRent, fill: "#f59e0b" },
        { name: "Overdue", value: stats.overdueRent, fill: "#ef4444" },
      ]
    : [];

  const totalUnits = (stats?.occupiedProperties || 0) + (stats?.vacantProperties || 0);
  const occupancyRate = totalUnits > 0 ? ((stats?.occupiedProperties || 0) / totalUnits) * 100 : 0;
  const pendingRent = Number(stats?.pendingRent || 0);
  const overdueRent = Number(stats?.overdueRent || 0);
  const paidRent = Number(stats?.totalPaidAmount || 0);
  const totalRentVolume = paidRent + pendingRent + overdueRent;
  const collectionRate = totalRentVolume > 0 ? (paidRent / totalRentVolume) * 100 : 0;
  const overdueRate = totalRentVolume > 0 ? (overdueRent / totalRentVolume) * 100 : 0;
  const analyticsRent = analytics?.rentSummary || {};
  const onboardingSteps = [
    {
      id: "property",
      label: "Create your first property",
      done: (stats?.totalProperties || 0) > 0,
      actionLabel: "Open Properties",
      action: () => navigate("/owner/properties"),
    },
    {
      id: "tenant",
      label: "Assign your first tenant",
      done: (stats?.activeLeases || 0) > 0,
      actionLabel: "Open Tenants",
      action: () => navigate("/owner/tenants"),
    },
    {
      id: "rent",
      label: "Generate first rent cycle",
      done: (stats?.totalRentRecords || 0) > 0,
      actionLabel: "Open Rent",
      action: () => navigate("/owner/rent"),
    },
  ];
  const onboardingDone = onboardingSteps.filter((step) => step.done).length;
  const onboardingProgress = (onboardingDone / onboardingSteps.length) * 100;

  const inquiryTotals = recentInquiries.reduce(
    (acc, inquiry) => {
      const status = (inquiry.status || "New").toLowerCase();
      if (status === "new") acc.new += 1;
      else if (status === "in progress") acc.inProgress += 1;
      else if (status === "contacted") acc.contacted += 1;
      else if (status === "closed") acc.closed += 1;
      else acc.other += 1;
      return acc;
    },
    { new: 0, inProgress: 0, contacted: 0, closed: 0, other: 0 }
  );

  const actionableLeads = inquiryTotals.new + inquiryTotals.inProgress;
  const convertedLeads = inquiryTotals.contacted + inquiryTotals.closed;
  const leadPool = actionableLeads + convertedLeads;
  const conversionMomentum = leadPool > 0 ? (convertedLeads / leadPool) * 100 : 0;

  const exportAnalytics = async () => {
    try {
      const response = await api.get("/owner/analytics/export", { responseType: "blob" });
      const blob = new Blob([response.data], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `analytics-${Date.now()}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("Unable to export analytics.");
    }
  };

  const updateInquiryStatus = async (inquiryId, status) => {
    try {
      setUpdatingInquiryId(inquiryId);
      await api.patch(`/owner/inquiries/${inquiryId}/status`, { status });
      setRecentInquiries((prev) => prev.map((item) => (item._id === inquiryId ? { ...item, status } : item)));
      toast.success("Inquiry status updated.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Unable to update inquiry status.");
    } finally {
      setUpdatingInquiryId("");
    }
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-blue-100 via-purple-50 to-indigo-150 pb-8">
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl animate-blob" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl animate-blob-delay" />
      <div className="relative z-10 space-y-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <PageHeader
        title="Dashboard"
        subtitle="Welcome back. Here is your live portfolio command center with clear priorities."
        action={null}
      />

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-900 px-6 py-7 sm:px-8 sm:py-8 shadow-2xl animate-fade-up">
        <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-blue-400/30 blur-2xl animate-blob" />
        <div className="absolute -bottom-12 -left-12 h-36 w-36 rounded-full bg-indigo-400/20 blur-2xl animate-blob-delay" />
        <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="relative grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="md:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200">Portfolio Snapshot</p>
            <h2 className="mt-2 text-2xl font-extrabold text-white sm:text-3xl">Your property business at a glance</h2>
            <p className="mt-2 max-w-xl text-sm text-blue-100">
              Stay on top of occupancy, rent collection and maintenance with live indicators and actionable data.
            </p>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-100">Total Collection</p>
            <p className="mt-2 text-3xl font-extrabold text-white">{formatCurrency(paidRent)}</p>
            <p className="mt-1 flex items-center gap-1 text-xs text-emerald-300">
              <ArrowUpRight size={14} /> collection rate {collectionRate.toFixed(0)}%
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Total Properties" value={stats?.totalProperties || 0} subtitle="Across all locations" icon={Building2} accent="blue" />
        <MetricCard title="Active Leases" value={stats?.activeLeases || 0} subtitle="Tenant agreements running" icon={Users} accent="green" />
        <MetricCard title="Pending Rent" value={formatCurrency(pendingRent)} subtitle="Awaiting payment" icon={Wallet} accent="amber" />
        <MetricCard title="New Inquiries" value={stats?.newInquiries || 0} subtitle="Interest from prospective tenants" icon={Mail} accent="rose" />
      </div>

      <section className="rounded-2xl border border-gray-100 bg-white/95 p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <MessageCircle size={18} className="text-blue-600" /> Recent Property Inquiries
          </h3>
          <span className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-blue-700">
            {stats?.totalInquiries || 0} total
          </span>
        </div>

        {recentInquiries.length === 0 ? (
          <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-600">
            No inquiries received yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {recentInquiries.map((inquiry) => (
              <div key={inquiry._id} className="rounded-xl border border-gray-100 bg-gradient-to-br from-white to-slate-50 p-3.5 hover:shadow-md transition-all duration-200">
                <div className="flex flex-col gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {inquiry.property?.propertyType || "Property"} - {inquiry.property?.address?.city || "N/A"}
                    </p>
                    <p className="mt-1 text-xs text-gray-600">Inquirer: {inquiry.inquirer?.name || "N/A"}</p>
                    <p className="text-xs text-gray-500">Email: {inquiry.inquirer?.email || "N/A"}</p>
                    <p className="text-xs text-gray-500 inline-flex items-center gap-1"><Phone size={12} /> {inquiry.inquirer?.phone || "N/A"}</p>
                    {inquiry.message ? (
                      <p className="mt-2 rounded-lg border border-blue-100 bg-blue-50 px-2 py-1.5 text-xs text-blue-700">
                        {inquiry.message}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-1 border-t border-gray-100">
                    <p className="text-[11px] text-gray-500">Received on {new Date(inquiry.createdAt).toLocaleString()}</p>
                    <div className="w-full sm:w-auto">
                      <select
                        value={inquiry.status || "New"}
                        onChange={(e) => updateInquiryStatus(inquiry._id, e.target.value)}
                        disabled={updatingInquiryId === inquiry._id}
                        className="w-full sm:w-auto rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-60"
                      >
                        <option value="New">New</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Contacted">Contacted</option>
                        <option value="Closed">Closed</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <section className="rounded-2xl border border-gray-100 bg-white/95 p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
                <Rocket size={18} className="text-indigo-600" /> Value in 3 Minutes Onboarding
              </h3>
              <p className="mt-1 text-xs text-gray-500">Finish these 3 actions to activate your full owner workflow.</p>
            </div>
            <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
              {onboardingDone}/{onboardingSteps.length} done
            </span>
          </div>
          <div className="mb-4 h-2 rounded-full bg-gray-100">
            <div className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-blue-500" style={{ width: `${onboardingProgress}%` }} />
          </div>
          <div className="space-y-3">
            {onboardingSteps.map((step) => (
              <div key={step.id} className="rounded-xl border border-gray-100 px-3 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Sparkles size={14} className={step.done ? "text-emerald-600" : "text-gray-400"} />
                  <p className={`text-sm font-medium ${step.done ? "text-emerald-700" : "text-gray-700"}`}>{step.label}</p>
                </div>
                {step.done ? (
                  <span className="text-xs font-semibold text-emerald-700">Completed</span>
                ) : (
                  <button type="button" onClick={step.action} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                    {step.actionLabel}
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
                <Rocket size={18} className="text-emerald-600" /> Client Acquisition Sprint
              </h3>
              <p className="mt-1 text-xs text-gray-600">
                Prioritize hot leads and respond faster to improve conversion this week.
              </p>
            </div>
            <span className="rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-xs font-semibold text-emerald-700">
              Momentum {conversionMomentum.toFixed(0)}%
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div className="rounded-xl border border-white/80 bg-white/90 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">New Leads</p>
              <p className="mt-1 text-2xl font-extrabold text-gray-900">{inquiryTotals.new}</p>
              <p className="text-xs text-gray-500">Need first response</p>
            </div>
            <div className="rounded-xl border border-white/80 bg-white/90 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Active Follow-ups</p>
              <p className="mt-1 text-2xl font-extrabold text-gray-900">{inquiryTotals.inProgress}</p>
              <p className="text-xs text-gray-500">In negotiation stage</p>
            </div>
            <div className="rounded-xl border border-white/80 bg-white/90 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Converted/Contacted</p>
              <p className="mt-1 text-2xl font-extrabold text-gray-900">{convertedLeads}</p>
              <p className="text-xs text-gray-500">Relationship in motion</p>
            </div>
          </div>

          <div className="rounded-xl border border-emerald-100 bg-white/80 p-3.5">
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-gray-800">Quick Actions</p>
              <p className="text-xs text-gray-500">Fast path to close more clients</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => navigate("/owner/inquiries")}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
              >
                Review Inquiry Queue ({actionableLeads})
              </button>
              <button
                type="button"
                onClick={() => navigate("/owner/vacancies")}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Promote Vacant Units
              </button>
              <button
                type="button"
                onClick={() => navigate("/owner/properties")}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Refresh Listing Details
              </button>
            </div>
          </div>
        </section>

      </div>

      <section className="rounded-2xl border border-gray-100 bg-white/95 p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <Mail size={18} className="text-indigo-600" /> High-Intent Leads
          </h3>
          <button
            type="button"
            onClick={() => navigate("/owner/inquiries")}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            View All Leads
          </button>
        </div>

        {recentInquiries.filter((i) => ["New", "In Progress"].includes(i.status || "New")).length === 0 ? (
          <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-600">
            No urgent leads right now. Keep listings fresh to attract new inquiries.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {recentInquiries
              .filter((i) => ["New", "In Progress"].includes(i.status || "New"))
              .slice(0, 4)
              .map((lead) => (
                <div key={lead._id} className="rounded-xl border border-indigo-100 bg-gradient-to-br from-white to-indigo-50/40 p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{lead.inquirer?.name || "Prospect"}</p>
                      <p className="text-xs text-gray-600 mt-0.5">
                        Interested in {lead.property?.propertyType || "property"} - {lead.property?.address?.city || "N/A"}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{lead.inquirer?.email || "No email"}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      (lead.status || "New") === "New"
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : "bg-blue-50 text-blue-700 border border-blue-200"
                    }`}>
                      {lead.status || "New"}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => updateInquiryStatus(lead._id, "Contacted")}
                      disabled={updatingInquiryId === lead._id}
                      className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
                    >
                      Mark Contacted
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate("/owner/inquiries")}
                      className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      Open Lead
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-gray-100 bg-white/95 p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <TrendingUp size={18} className="text-emerald-600" /> Analytics Snapshot
          </h3>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={exportAnalytics} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 inline-flex items-center gap-1.5">
              <Download size={14} /> Export CSV
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Paid Revenue</p>
            <p className="mt-1 text-xl font-bold text-emerald-900">{formatCurrency(analyticsRent.paid || 0)}</p>
            <p className="text-xs text-emerald-800 mt-1">{analyticsRent.paidCount || 0} paid records</p>
          </div>
          <div className="rounded-xl border border-amber-100 bg-amber-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">Pending Volume</p>
            <p className="mt-1 text-xl font-bold text-amber-900">{formatCurrency(analyticsRent.pending || 0)}</p>
            <p className="text-xs text-amber-800 mt-1">{analyticsRent.pendingCount || 0} pending records</p>
          </div>
          <div className="rounded-xl border border-red-100 bg-red-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-red-700">Overdue Volume</p>
            <p className="mt-1 text-xl font-bold text-red-900">{formatCurrency(analyticsRent.overdue || 0)}</p>
            <p className="text-xs text-red-800 mt-1">{analyticsRent.overdueCount || 0} overdue records</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-100 bg-white/95 p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <BellRing size={18} className="text-blue-600" /> Smart Alerts
          </h3>
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            {alerts.length} active
          </span>
        </div>

        {alerts.length === 0 ? (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            No critical alerts right now. Portfolio health looks good.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {alerts.map((alert) => {
              const Icon = alert.icon;
              const toneClasses = {
                red: "border-red-100 bg-red-50 text-red-700",
                amber: "border-amber-100 bg-amber-50 text-amber-700",
                blue: "border-blue-100 bg-blue-50 text-blue-700",
                violet: "border-violet-100 bg-violet-50 text-violet-700",
              };

              return (
                <div key={alert.id} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm hover:shadow-md transition-all duration-200">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`rounded-lg p-2 ${toneClasses[alert.tone] || toneClasses.blue}`}>
                        <Icon size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{alert.title}</p>
                        <p className="mt-1 text-xs text-gray-600">{alert.detail}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={alert.onAction}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      {alert.actionLabel}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-gray-100 bg-white/95 p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <ShieldCheck size={18} className="text-emerald-600" /> Recent Compliance Uploads
          </h3>
          <button
            type="button"
            onClick={() => navigate("/owner/tenants")}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            Manage Docs
          </button>
        </div>

        {recentComplianceDocs.length === 0 ? (
          <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-600">
            No compliance documents uploaded yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {recentComplianceDocs.map((doc) => (
              <a
                key={doc._id}
                href={`${API_BASE}${doc.filePath}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-gray-100 p-3 hover:bg-gray-50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 inline-flex items-center gap-1.5">
                      <FileText size={14} className="text-blue-600" /> {doc.documentType}
                    </p>
                    <p className="mt-1 text-xs text-gray-600">
                      {doc.tenant?.name || "Tenant"} - {doc.property?.address?.city || "N/A"}
                    </p>
                    <p className="text-xs text-gray-500">Uploaded on {new Date(doc.createdAt).toLocaleDateString()}</p>
                  </div>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${doc.uploadedByRole === "tenant" ? "border-blue-200 bg-blue-50 text-blue-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
                    {doc.uploadedByRole === "tenant" ? "Tenant" : "Owner"}
                  </span>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Occupied Units" value={stats?.occupiedProperties || 0} subtitle="Currently rented" icon={Building2} accent="violet" />
        <MetricCard title="Vacant Units" value={stats?.vacantProperties || 0} subtitle="Ready for lease" icon={MapPin} accent="slate" />
        <MetricCard title="Overdue Rent" value={formatCurrency(overdueRent)} subtitle="Needs urgent follow-up" icon={AlertTriangle} accent="rose" />
        <MetricCard title="Resolved Value" value={formatCurrency(paidRent)} subtitle="Total amount received" icon={TrendingUp} accent="green" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white/95 p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)] xl:col-span-1">
          <h3 className="mb-5 flex items-center gap-2 text-base font-semibold text-gray-800">
            <ClipboardList size={18} className="text-blue-600" /> Performance Indicators
          </h3>
          <div className="space-y-5">
            <ProgressStat
              label="Occupancy Rate"
              value={occupancyRate}
              tone="blue"
              icon={Home}
              helper="Share of units currently leased"
            />
            <ProgressStat
              label="Rent Collection Rate"
              value={collectionRate}
              tone="green"
              icon={CircleDollarSign}
              helper="Collected against total rent cycle"
            />
            <ProgressStat
              label="Overdue Exposure"
              value={overdueRate}
              tone="red"
              icon={ShieldAlert}
              helper="Portion of rent currently overdue"
            />
          </div>
        </div>

        {/* Occupancy Chart */}
        <div className="rounded-2xl border border-gray-100 bg-white/95 p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)] xl:col-span-1">
          <h3 className="mb-4 text-base font-semibold text-gray-800">Occupancy Status</h3>
          {pieData.some((d) => d.value > 0) ? (
            <div className="space-y-4">
              <ResponsiveContainer width="100%" height={170}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={64} innerRadius={38} dataKey="value" paddingAngle={4}>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value} units`} />
                </PieChart>
              </ResponsiveContainer>

              <div className="grid grid-cols-1 gap-2">
                {pieData.map((item, i) => (
                  <div key={item.name} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-sm font-medium text-gray-700">{item.name}</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-gray-400 text-center py-12">No property data yet.</p>
          )}
        </div>

        {/* Rent Status Chart */}
        <div className="rounded-2xl border border-gray-100 bg-white/95 p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)] xl:col-span-1">
          <h3 className="mb-4 text-base font-semibold text-gray-800">Rent Overview</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={rentData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {rentData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      </div>
    </div>
  );
};

export default OwnerDashboard;
