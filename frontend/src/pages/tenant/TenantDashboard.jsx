import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  Wrench,
  Calendar,
  Wallet,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Phone,
  Mail,
  BellRing,
  Clock3,
  Siren,
  ScrollText,
  DoorOpen,
  ClipboardCheck,
  FileText,
  Upload,
  ShieldCheck,
  MessageCircle,
  Home,
  Rocket,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Modal, PageHeader, StatusBadge } from "../../components/UI";
import api from "../../utils/api";
import { formatCurrency } from "../../utils/currency";
import toast from "react-hot-toast";

const toDateLabel = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
};

const TenantDashboard = () => {
  const DOC_TYPES = ["Rent Agreement", "Aadhaar Card", "PAN Card", "Police Verification", "Other"];
  const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "");

  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [moveOutRequests, setMoveOutRequests] = useState([]);
  const [moveOutModal, setMoveOutModal] = useState(false);
  const [submittingMoveOut, setSubmittingMoveOut] = useState(false);
  const [moveOutForm, setMoveOutForm] = useState({ requestedMoveOutDate: "", reason: "" });
  const [complianceDocs, setComplianceDocs] = useState([]);
  const [renewals, setRenewals] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [docsModal, setDocsModal] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docForm, setDocForm] = useState({
    documentType: "Aadhaar Card",
    documentNumber: "",
    notes: "",
    document: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [{ data: res }, { data: rentRes }, { data: maintenanceRes }, { data: moveOutRes }, { data: docsRes }, { data: renewalRes }, { data: inquiryRes }] = await Promise.all([
          api.get("/tenant/dashboard"),
          api.get("/tenant/rent-history"),
          api.get("/tenant/maintenance"),
          api.get("/tenant/move-out"),
          api.get("/tenant/compliance-documents"),
          api.get("/tenant/renewals"),
          api.get("/tenant/inquiries"),
        ]);

        setData(res);

        const lease = res?.lease;
        const rents = rentRes?.rents || [];
        const requests = maintenanceRes?.requests || [];
        const moveOutHistory = moveOutRes?.requests || [];
        const docs = docsRes?.documents || [];

        setMoveOutRequests(moveOutHistory);
        setComplianceDocs(docs);
        setRenewals(renewalRes?.renewals || []);
        setInquiries(inquiryRes?.inquiries || []);

        const now = new Date();
        const within7Days = new Date();
        within7Days.setDate(now.getDate() + 7);
        const within30Days = new Date();
        within30Days.setDate(now.getDate() + 30);

        const overdueRents = rents.filter((rent) => rent.status === "Overdue");
        const dueSoonRents = rents.filter((rent) => {
          if (rent.status !== "Pending") return false;
          const dueDate = new Date(rent.dueDate);
          return dueDate >= now && dueDate <= within7Days;
        });

        const openRequests = requests.filter((req) => ["Open", "In Progress"].includes(req.status));
        const highPriorityRequests = openRequests.filter((req) => ["High", "Emergency"].includes(req.urgency));

        const leaseEndSoon = lease?.leaseEndDate
          ? new Date(lease.leaseEndDate) >= now && new Date(lease.leaseEndDate) <= within30Days
          : false;

        const nextAlerts = [];

        if (overdueRents.length > 0) {
          const overdueAmount = overdueRents.reduce((sum, rent) => sum + Number(rent.amount || 0), 0);
          nextAlerts.push({
            id: "overdue-rent",
            tone: "red",
            icon: Siren,
            title: `${overdueRents.length} overdue rent record${overdueRents.length > 1 ? "s" : ""}`,
            detail: `${formatCurrency(overdueAmount)} is overdue. Consider clearing this first.`,
            actionLabel: "Open Rent",
            onAction: () => navigate("/tenant/rent"),
          });
        }

        if (dueSoonRents.length > 0) {
          nextAlerts.push({
            id: "rent-due-soon",
            tone: "blue",
            icon: Clock3,
            title: `${dueSoonRents.length} rent payment${dueSoonRents.length > 1 ? "s" : ""} due this week`,
            detail: "Pay early to avoid overdue penalties.",
            actionLabel: "View Due Rent",
            onAction: () => navigate("/tenant/rent"),
          });
        }

        if (leaseEndSoon) {
          nextAlerts.push({
            id: "lease-end-soon",
            tone: "amber",
            icon: ScrollText,
            title: "Lease ending within 30 days",
            detail: "Coordinate with your owner for renewal or move-out planning.",
            actionLabel: "Review Lease",
            onAction: () => navigate("/tenant/dashboard"),
          });
        }

        if (highPriorityRequests.length > 0) {
          nextAlerts.push({
            id: "urgent-maintenance",
            tone: "violet",
            icon: BellRing,
            title: `${highPriorityRequests.length} urgent maintenance request${highPriorityRequests.length > 1 ? "s" : ""} open`,
            detail: "Track updates and comments from your owner.",
            actionLabel: "Open Requests",
            onAction: () => navigate("/tenant/maintenance"),
          });
        } else if (openRequests.length > 0) {
          nextAlerts.push({
            id: "open-maintenance",
            tone: "blue",
            icon: Wrench,
            title: `${openRequests.length} maintenance request${openRequests.length > 1 ? "s" : ""} in progress`,
            detail: "You can add updates or photos in My Requests.",
            actionLabel: "My Requests",
            onAction: () => navigate("/tenant/maintenance"),
          });
        }

        setAlerts(nextAlerts);
      } catch {
        toast.error("Failed to load dashboard.");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading dashboard...</div>;

  const lease = data?.lease;
  const stats = data?.stats;
  const pendingMoveOut = moveOutRequests.find((r) => r.status === "Pending");
  const latestMoveOut = moveOutRequests[0];
  const pendingRent = Number(stats?.pendingRent || 0);
  const overdueRent = Number(stats?.overdueRent || 0);
  const openRequests = Number(stats?.openRequests || 0);
  const payableRent = pendingRent + overdueRent;
  const sortedRenewals = [...renewals].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const renewalByPropertyId = sortedRenewals.reduce((acc, renewal) => {
    const propertyId = renewal.property?._id;
    if (!propertyId || acc[propertyId]) return acc;
    acc[propertyId] = renewal;
    return acc;
  }, {});
  const propertyTimelineTiles = Object.values(renewalByPropertyId);
  const leaseDurations = (() => {
    const durations = [];
    if (lease) {
      durations.push({
        id: `active-${lease._id}`,
        label: "Current Term",
        rentAmount: lease.rentAmount,
        startDate: lease.leaseStartDate,
        endDate: lease.leaseEndDate,
        status: "Active",
      });
    }
    const samePropertyRenewals = sortedRenewals.filter((renewal) => {
      if (!lease?.property?._id || !renewal.property?._id) return false;
      return renewal.property._id === lease.property._id;
    });
    samePropertyRenewals.forEach((renewal) => {
      durations.push({
        id: renewal._id,
        renewalId: renewal._id,
        label: "Renewal Term",
        rentAmount: renewal.proposedRentAmount,
        startDate: renewal.proposedLeaseStartDate,
        endDate: renewal.proposedLeaseEndDate,
        status: renewal.status,
        note: renewal.note || "",
      });
    });
    const seen = new Set();
    return durations.filter((duration) => {
      const key = `${duration.startDate || ""}|${duration.endDate || ""}|${Number(duration.rentAmount || 0)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  })();
  const propertyRenewalsForLease = sortedRenewals.filter((renewal) => {
    if (!lease?.property?._id || !renewal.property?._id) return false;
    return renewal.property._id === lease.property._id;
  });
  const successReadiness = Math.round(
    ((lease ? 1 : 0) + (complianceDocs.length > 0 ? 1 : 0) + (inquiries.length > 0 ? 1 : 0) + (payableRent === 0 ? 1 : 0)) / 4 * 100
  );
  const openInquiryCount = inquiries.filter((inq) => ["New", "In Progress"].includes(inq.status || "New")).length;
  const conversionSteps = [
    {
      id: "rent",
      title: "Clear pending dues",
      desc: "Pay on time to keep your tenancy profile healthy.",
      done: payableRent === 0,
      cta: "Pay Rent",
      action: () => navigate("/tenant/rent"),
    },
    {
      id: "docs",
      title: "Upload compliance docs",
      desc: "Verified documentation builds trust quickly.",
      done: complianceDocs.length > 0,
      cta: "Upload Docs",
      action: () => setDocsModal(true),
    },
    {
      id: "inquiry",
      title: "Engage with owner",
      desc: "Follow-up on inquiries to move deals faster.",
      done: openInquiryCount === 0 && inquiries.length > 0,
      cta: "Open Inquiries",
      action: () => {
        const section = document.getElementById("tenant-inquiries-section");
        if (section) section.scrollIntoView({ behavior: "smooth", block: "start" });
      },
    },
  ];
  const handleMoveOutRequest = async (e) => {
    e.preventDefault();
    setSubmittingMoveOut(true);
    try {
      await api.post("/tenant/move-out", moveOutForm);
      toast.success("Move-out request submitted.");
      setMoveOutModal(false);
      setMoveOutForm({ requestedMoveOutDate: "", reason: "" });
      const { data: moveOutRes } = await api.get("/tenant/move-out");
      setMoveOutRequests(moveOutRes.requests || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit request.");
    } finally {
      setSubmittingMoveOut(false);
    }
  };

  const uploadComplianceDoc = async (e) => {
    e.preventDefault();
    if (!docForm.document) {
      toast.error("Please select a document file.");
      return;
    }

    const payload = new FormData();
    payload.append("documentType", docForm.documentType);
    payload.append("documentNumber", docForm.documentNumber);
    payload.append("notes", docForm.notes);
    payload.append("document", docForm.document);

    setUploadingDoc(true);
    try {
      await api.post("/tenant/compliance-documents", payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Document uploaded successfully.");
      setDocForm({
        documentType: "Aadhaar Card",
        documentNumber: "",
        notes: "",
        document: null,
      });
      setDocsModal(false);
      const { data: docsRes } = await api.get("/tenant/compliance-documents");
      setComplianceDocs(docsRes.documents || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to upload document.");
    } finally {
      setUploadingDoc(false);
    }
  };

  const respondRenewal = async (renewalId, status) => {
    try {
      await api.patch(`/tenant/renewals/${renewalId}/decision`, { status });
      toast.success(`Renewal ${status.toLowerCase()}.`);
      const { data: renewalRes } = await api.get("/tenant/renewals");
      setRenewals(renewalRes?.renewals || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Unable to submit renewal decision.");
    }
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-green-100 via-blue-50 to-cyan-150 pb-8">
      <div className="absolute top-0 right-0 w-96 h-96 bg-green-400/20 rounded-full blur-3xl animate-blob" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-400/20 rounded-full blur-3xl animate-blob-delay" />
      <div className="relative z-10 space-y-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <PageHeader
        title="My Dashboard"
        subtitle="Your complete tenancy command center with rent, requests, lease timeline and documents"
        action={
          <button
            type="button"
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <Home size={14} /> Back to Home
          </button>
        }
      />

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-900 px-6 py-7 sm:px-8 shadow-2xl animate-fade-up">
        <div className="absolute -top-10 -right-8 h-28 w-28 rounded-full bg-blue-400/20 blur-2xl animate-blob" />
        <div className="absolute -bottom-10 -left-8 h-32 w-32 rounded-full bg-indigo-400/20 blur-2xl animate-blob-delay" />
        <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-4 text-white">
          <div className="md:col-span-2">
            <p className="text-xs uppercase tracking-[0.16em] text-blue-200 font-semibold">Tenant Hub</p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold">Everything about your tenancy in one place</h2>
            <p className="mt-2 text-sm text-blue-100 max-w-xl">
              Track rent dues, maintenance requests, lease timeline and property details without confusion.
            </p>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
            <p className="text-xs uppercase tracking-wider text-blue-200 font-semibold">Total Payable</p>
            <p className="mt-2 text-3xl font-extrabold">{formatCurrency(payableRent)}</p>
            <p className="mt-1 text-xs text-blue-100">Pending + overdue combined</p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-white to-amber-50 p-5 shadow-[0_8px_22px_rgba(251,191,36,0.12)]">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Pending Rent</p>
          <p className="mt-2 text-3xl font-extrabold text-amber-700">{formatCurrency(pendingRent)}</p>
          <p className="text-xs text-gray-500 mt-1 inline-flex items-center gap-1"><Wallet size={12} /> Awaiting payment</p>
        </div>
        <div className="rounded-2xl border border-red-100 bg-gradient-to-br from-white to-red-50 p-5 shadow-[0_8px_22px_rgba(239,68,68,0.10)]">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Overdue Rent</p>
          <p className="mt-2 text-3xl font-extrabold text-red-700">{formatCurrency(overdueRent)}</p>
          <p className="text-xs text-gray-500 mt-1 inline-flex items-center gap-1"><AlertTriangle size={12} /> Needs immediate action</p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/tenant/maintenance")}
          className="rounded-2xl border border-blue-100 bg-gradient-to-br from-white to-blue-50 p-5 shadow-[0_8px_22px_rgba(59,130,246,0.12)] text-left hover:shadow-[0_14px_28px_rgba(59,130,246,0.22)] hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Open Requests</p>
          <p className="mt-2 text-3xl font-extrabold text-blue-700">{openRequests}</p>
          <p className="text-xs text-gray-500 mt-1 inline-flex items-center gap-1"><Wrench size={12} /> Maintenance in progress</p>
        </button>
      </div>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 rounded-2xl border border-gray-100 bg-white/95 p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
                <Rocket size={18} className="text-indigo-600" /> Tenant Success Accelerator
              </h3>
              <p className="mt-1 text-xs text-gray-500">Complete these actions to improve owner confidence and close faster on opportunities.</p>
            </div>
            <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
              Readiness {successReadiness}%
            </span>
          </div>

          <div className="mb-4 h-2.5 rounded-full bg-gray-100">
            <div
              className="h-2.5 rounded-full bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-500"
              style={{ width: `${successReadiness}%` }}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {conversionSteps.map((step) => (
              <div key={step.id} className="rounded-xl border border-gray-100 bg-gradient-to-br from-white to-slate-50 p-3.5">
                <p className="text-sm font-semibold text-gray-900">{step.title}</p>
                <p className="mt-1 text-xs text-gray-500">{step.desc}</p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  {step.done ? (
                    <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                      <CheckCircle2 size={12} /> Completed
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={step.action}
                      className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      {step.cta} <ArrowRight size={12} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-cyan-100 bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50 p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
          <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <Sparkles size={17} className="text-cyan-600" /> Why Owners Respond Faster
          </h3>
          <div className="mt-3 space-y-2.5 text-sm text-gray-700">
            <div className="rounded-lg border border-white/80 bg-white/80 p-2.5">On-time payments increase trust and approval speed.</div>
            <div className="rounded-lg border border-white/80 bg-white/80 p-2.5">Clear documentation reduces verification delays.</div>
            <div className="rounded-lg border border-white/80 bg-white/80 p-2.5">Active communication improves conversion of inquiries.</div>
          </div>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:from-cyan-500 hover:to-blue-500"
          >
            Explore More Listings <ArrowRight size={13} />
          </button>
        </div>
      </section>

      <section id="tenant-inquiries-section" className="rounded-2xl border border-gray-100 bg-white/95 p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
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
            You are all caught up. No urgent tenancy alerts at the moment.
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
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <MessageCircle size={18} className="text-cyan-600" /> My Property Inquiries
          </h3>
          <span className="rounded-full border border-cyan-100 bg-cyan-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-cyan-700">
            {inquiries.length} total
          </span>
        </div>

        {inquiries.length === 0 ? (
          <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-600">
            You have not sent any property inquiry yet. Explore listings on the landing page and click Interested.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {inquiries.slice(0, 6).map((inquiry) => (
              <div key={inquiry._id} className="rounded-xl border border-gray-100 bg-gradient-to-br from-white to-cyan-50/40 p-3.5 hover:shadow-md transition-all duration-200">
                <div className="flex flex-col gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {inquiry.property?.propertyType || "Property"} - {inquiry.property?.address?.city || "N/A"}
                    </p>
                    <p className="mt-1 text-xs text-gray-600">Owner: {inquiry.owner?.name || "N/A"}</p>
                    <p className="text-xs text-gray-500">Email: {inquiry.owner?.email || "N/A"}</p>
                    <p className="text-xs text-gray-500 inline-flex items-center gap-1"><Phone size={12} /> {inquiry.owner?.phone || "N/A"}</p>
                    {inquiry.message ? (
                      <p className="mt-2 rounded-lg border border-cyan-100 bg-cyan-50 px-2 py-1.5 text-xs text-cyan-700">
                        {inquiry.message}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-1 border-t border-gray-100">
                    <p className="text-[11px] text-gray-500">Sent on {new Date(inquiry.createdAt).toLocaleString()}</p>
                    <span className={`inline-flex w-fit text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                      inquiry.status === "Closed"
                        ? "border-gray-200 bg-gray-100 text-gray-700"
                        : inquiry.status === "Contacted"
                          ? "border-blue-200 bg-blue-50 text-blue-700"
                      : inquiry.status === "In Progress"
                        ? "border-amber-200 bg-amber-50 text-amber-700"
                          : "border-emerald-200 bg-emerald-50 text-emerald-700"
                    }`}>
                      {inquiry.status || "New"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {lease ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Property Info */}
          <div className="rounded-2xl border border-gray-100 bg-white/95 p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-blue-50 rounded-lg"><Building2 size={18} className="text-blue-600" /></div>
              <h3 className="font-semibold text-gray-900">My Property</h3>
              <StatusBadge status={lease.property?.status} />
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-gray-500">Type</span>
                <span className="font-medium text-gray-900">{lease.property?.propertyType}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-gray-500">Address</span>
                <span className="font-medium text-gray-900 text-right inline-flex items-start gap-1.5">
                  <MapPin size={13} className="mt-0.5 text-gray-400" />
                  <span>
                  {lease.property?.address?.street}, {lease.property?.address?.city}
                  </span>
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-gray-500">Rooms</span>
                <span className="font-medium text-gray-900">{lease.property?.numberOfRooms}</span>
              </div>
              <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-xs text-emerald-800 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold uppercase tracking-wider">Lease Journey Timeline</p>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">{leaseDurations.length} terms</span>
                </div>
                {leaseDurations.map((duration) => (
                  <div key={duration.id} className={`rounded-md border px-2.5 py-2 ${duration.status === "Pending" ? "border-amber-300 bg-amber-50" : "border-emerald-200 bg-white"}`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-emerald-900">{duration.label}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        duration.status === "Active" ? "bg-emerald-100 text-emerald-700" :
                        duration.status === "Pending" ? "bg-amber-100 text-amber-700" :
                        duration.status === "Accepted" ? "bg-blue-100 text-blue-700" :
                        "bg-gray-100 text-gray-600"
                      }`}>{duration.status}</span>
                    </div>
                    <p className="mt-1">{formatCurrency(duration.rentAmount || 0)} | {toDateLabel(duration.startDate)} &rarr; {toDateLabel(duration.endDate)}</p>
                    {duration.note ? <p className="mt-1 text-[11px] text-amber-800">Owner note: {duration.note}</p> : null}
                    {duration.status === "Pending" && duration.renewalId ? (
                      <div className="mt-2.5 flex gap-2">
                        <button
                          type="button"
                          onClick={() => respondRenewal(duration.renewalId, "Accepted")}
                          className="rounded-md border border-emerald-300 bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-700"
                        >
                          Accept Renewal
                        </button>
                        <button
                          type="button"
                          onClick={() => respondRenewal(duration.renewalId, "Rejected")}
                          className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-red-600 hover:bg-red-50"
                        >
                          Reject
                        </button>
                      </div>
                    ) : null}
                  </div>
                ))}
                {leaseDurations.length === 0 ? <p>No lease timeline available yet.</p> : null}
              </div>

              <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-3 text-xs text-indigo-800 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold uppercase tracking-wider">Move-In / Move-Out</p>
                  {latestMoveOut ? <StatusBadge status={latestMoveOut.status} /> : null}
                </div>
                <p>Move In: {toDateLabel(lease.leaseStartDate || lease.createdAt)}</p>
                <p>
                  Move Out: {latestMoveOut ? toDateLabel(latestMoveOut.completedAt || latestMoveOut.approvedLastStayingDate || latestMoveOut.requestedMoveOutDate) : "Not requested"}
                </p>
                {latestMoveOut?.status === "Approved" && latestMoveOut?.closingFormalities ? (
                  <p>Closing formalities: {latestMoveOut.closingFormalities}</p>
                ) : null}
                {latestMoveOut?.status === "Rejected" && latestMoveOut?.ownerNote ? (
                  <p>Owner note: {latestMoveOut.ownerNote}</p>
                ) : null}
                <button
                  type="button"
                  onClick={() => setMoveOutModal(true)}
                  disabled={!!pendingMoveOut}
                  className="mt-1 rounded-md border border-indigo-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-1"
                >
                  <DoorOpen size={12} /> {pendingMoveOut ? "Move-Out Pending" : "Request Move-Out"}
                </button>
              </div>


              {lease.property?.description && (
                <div className="pt-1">
                  <span className="text-gray-500">Description</span>
                  <p className="text-gray-700 mt-1 bg-gray-50 border border-gray-100 rounded-lg p-2.5">{lease.property.description}</p>
                </div>
              )}

              <div className="pt-4 mt-2 border-t border-gray-100 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-sm font-semibold text-gray-900 inline-flex items-center gap-1.5">
                    <ShieldCheck size={15} className="text-emerald-600" /> Compliance Documents
                  </h4>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{complianceDocs.length} uploaded</span>
                </div>

                <button
                  type="button"
                  onClick={() => setDocsModal(true)}
                  className="btn-primary inline-flex items-center gap-1.5 text-sm w-full justify-center"
                >
                  <Upload size={14} /> Upload Document
                </button>

                {complianceDocs.length === 0 ? (
                  <p className="text-xs text-gray-500">No compliance documents uploaded yet.</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {complianceDocs.slice(0, 8).map((doc) => (
                      <a
                        key={doc._id}
                        href={`${API_BASE}${doc.filePath}`}
                        target="_blank"
                        rel="noreferrer"
                        className="block rounded-lg border border-gray-100 px-3 py-2 hover:bg-gray-50"
                      >
                        <p className="text-sm font-semibold text-gray-900 inline-flex items-center gap-1.5">
                          <FileText size={14} className="text-blue-600" /> {doc.documentType}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">Uploaded on {new Date(doc.createdAt).toLocaleDateString()}</p>
                        {doc.documentNumber ? <p className="text-xs text-gray-500">No: {doc.documentNumber}</p> : null}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Lease Info */}
          <div className="rounded-2xl border border-gray-100 bg-white/95 p-5 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-green-50 rounded-lg"><Calendar size={18} className="text-green-600" /></div>
              <h3 className="font-semibold text-gray-900">Lease Details</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-gray-500">Monthly Rent</span>
                <span className="font-semibold text-gray-900">{formatCurrency(lease.rentAmount)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-gray-500">Security Deposit</span>
                <span className="font-medium text-gray-900">{formatCurrency(lease.securityDeposit)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-gray-500">Rent Due Day</span>
                <span className="font-medium text-gray-900">{lease.rentDueDay} of every month</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-gray-500">Lease Start</span>
                <span className="font-medium text-gray-900">{toDateLabel(lease.leaseStartDate)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-gray-500">Lease End</span>
                <span className="font-medium text-gray-900">{toDateLabel(lease.leaseEndDate)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-100">
                <span className="text-gray-500">Owner</span>
                <div className="text-right">
                  <p className="font-medium text-gray-900 inline-flex items-center gap-1"><CheckCircle2 size={12} className="text-emerald-600" />{lease.owner?.name}</p>
                  <p className="text-xs text-gray-400 inline-flex items-center gap-1"><Mail size={11} />{lease.owner?.email}</p>
                  {lease.owner?.phone && <p className="text-xs text-gray-400 inline-flex items-center gap-1"><Phone size={11} />{lease.owner?.phone}</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-100 bg-white text-center py-16 shadow-[0_8px_24px_rgba(15,23,42,0.06)]">
          <Building2 size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 text-lg">No active lease found.</p>
          <p className="text-gray-400 text-sm mt-1">Contact your property owner to be assigned a lease.</p>
        </div>
      )}

      <Modal isOpen={docsModal} onClose={() => setDocsModal(false)} title="Upload Compliance Document">
        <form onSubmit={uploadComplianceDoc} className="space-y-5">
          {/* Header Info */}
          <div className="rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 p-4">
            <div className="flex gap-3">
              <div className="p-2.5 bg-blue-100 rounded-lg h-fit">
                <FileText size={18} className="text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">Submit Important Documents</h3>
                <p className="text-xs text-gray-600 mt-1">Upload your compliance documents for owner verification and records.</p>
              </div>
            </div>
          </div>

          {/* Main form fields */}
          <div className="space-y-5">
            {/* Document Type Section */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2 inline-flex items-center gap-1.5">
                <ShieldCheck size={15} className="text-emerald-600" />
                Document Type *
              </label>
              <select
                value={docForm.documentType}
                onChange={(e) => setDocForm({ ...docForm, documentType: e.target.value })}
                className="input-field w-full font-medium"
              >
                {DOC_TYPES.map((type) => <option key={type}>{type}</option>)}
              </select>
            </div>

            {/* Document Number Section */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2 inline-flex items-center gap-1.5">
                <FileText size={15} className="text-blue-600" />
                Document Number *
              </label>
              <input
                value={docForm.documentNumber}
                onChange={(e) => setDocForm({ ...docForm, documentNumber: e.target.value })}
                className="input-field w-full"
                placeholder="e.g., XXXXXXXX1234 or Agreement#2025"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Enter your Aadhaar, PAN, or Agreement number for reference</p>
            </div>

            {/* File Upload Section */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-3 inline-flex items-center gap-1.5">
                <Upload size={15} className="text-cyan-600" />
                Upload Document *
              </label>
              <label className="cursor-pointer block">
                <div className="relative border-2 border-dashed border-gray-300 rounded-xl p-6 hover:border-blue-400 hover:bg-blue-50 transition-all bg-gray-50">
                  <input
                    type="file"
                    accept="application/pdf,image/png,image/jpeg,image/webp"
                    onChange={(e) => setDocForm({ ...docForm, document: e.target.files?.[0] || null })}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    required
                  />
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="p-3 bg-blue-100 rounded-lg mb-2">
                      <Upload size={24} className="text-blue-600" />
                    </div>
                    <p className="text-sm font-semibold text-gray-800">
                      {docForm.document ? docForm.document.name : "Click to upload or drag & drop"}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {docForm.document
                        ? `Size: ${(docForm.document.size / 1024 / 1024).toFixed(2)}MB`
                        : "PDF, JPG, PNG, or WEBP • Max 10MB"}
                    </p>
                  </div>
                </div>
              </label>
            </div>

            {/* Notes Section */}
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2 inline-flex items-center gap-1.5">
                <ClipboardCheck size={15} className="text-purple-600" />
                Notes or Comments
              </label>
              <textarea
                rows={3}
                value={docForm.notes}
                onChange={(e) => setDocForm({ ...docForm, notes: e.target.value })}
                className="input-field w-full resize-none"
                placeholder="Add any special context, expiry dates, or notes for owner review (optional)"
              />
            </div>

            {/* Info Box */}
            <div className="rounded-lg border border-amber-100 bg-amber-50 px-3.5 py-3 flex gap-2.5">
              <AlertTriangle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-800">
                <span className="font-semibold">Tip:</span> Upload clear, legible documents for faster verification. Owner will review and confirm receipt.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setDocsModal(false)}
              className="px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploadingDoc || !docForm.document}
              className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-semibold hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all inline-flex items-center gap-2 shadow-sm hover:shadow-md"
            >
              {uploadingDoc ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload size={16} />
                  Upload Document
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={moveOutModal} onClose={() => setMoveOutModal(false)} title="Request Move-Out">
        {!lease ? (
          <p className="text-sm text-gray-600">No active lease found. Move-out request is available only for active tenants.</p>
        ) : (
          <form onSubmit={handleMoveOutRequest} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Requested Move-Out Date</label>
              <input
                type="date"
                required
                value={moveOutForm.requestedMoveOutDate}
                onChange={(e) => setMoveOutForm({ ...moveOutForm, requestedMoveOutDate: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason (Optional)</label>
              <textarea
                rows={3}
                value={moveOutForm.reason}
                onChange={(e) => setMoveOutForm({ ...moveOutForm, reason: e.target.value })}
                className="input-field"
                placeholder="Mention relocation, job change, purchase, or other context"
              />
            </div>
            <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
              After owner approval, you will see confirmed last staying day and closing formalities here.
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setMoveOutModal(false)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={submittingMoveOut} className="btn-primary">
                {submittingMoveOut ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </form>
        )}
      </Modal>
      </div>
    </div>
  );
};

export default TenantDashboard;



