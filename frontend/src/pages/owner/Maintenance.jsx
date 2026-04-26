import React, { useEffect, useMemo, useState } from "react";
import {
  Wrench,
  MessageSquare,
  AlertTriangle,
  Clock3,
  CheckCircle2,
  MapPin,
  User,
  CalendarDays,
  Phone,
  Mail,
  BriefcaseBusiness,
  Search,
  LayoutGrid,
  Zap,
  Droplets,
  Hammer,
  Paintbrush,
  ClipboardList,
  Camera,
  BadgeIndianRupee,
  ThumbsUp,
  ThumbsDown,
  IndianRupee,
  Loader2,
} from "lucide-react";
import { PageHeader, Modal, StatusBadge, EmptyState } from "../../components/UI";
import api from "../../utils/api";
import toast from "react-hot-toast";

const STATUS_OPTIONS = ["Open", "In Progress", "Resolved"];
const CATEGORY_META = [
  { key: "All", icon: LayoutGrid },
  { key: "Electric", icon: Zap },
  { key: "Plumbing", icon: Droplets },
  { key: "General", icon: Wrench },
  { key: "Carpentry", icon: Hammer },
  { key: "Painting", icon: Paintbrush },
  { key: "Other", icon: BriefcaseBusiness },
];
const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "");

const getUrgencyPill = (urgency) => {
  const map = {
    Low: "bg-gray-100 text-gray-700 border-gray-200",
    Medium: "bg-blue-100 text-blue-700 border-blue-200",
    High: "bg-amber-100 text-amber-700 border-amber-200",
    Emergency: "bg-red-100 text-red-700 border-red-200",
  };
  return map[urgency] || map.Medium;
};

const toAssetUrl = (photoPath) => {
  if (!photoPath) return "";
  if (photoPath.startsWith("http")) return photoPath;
  return `${API_BASE}${photoPath}`;
};

const Maintenance = () => {
  const [requests, setRequests] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [commentModal, setCommentModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [comment, setComment] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [assigningVendorId, setAssigningVendorId] = useState("");
  const [vendorModalOpen, setVendorModalOpen] = useState(false);
  const [selectedRequestForAssignment, setSelectedRequestForAssignment] = useState(null);
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [vendorSearch, setVendorSearch] = useState("");
  const [vendorCategoryFilter, setVendorCategoryFilter] = useState("All");

  // Quote decision state
  const [quoteDecisionModal, setQuoteDecisionModal] = useState(false);
  const [quoteDecisionRequest, setQuoteDecisionRequest] = useState(null);
  const [quoteDecision, setQuoteDecision] = useState(""); // "Approved" | "Rejected"
  const [quoteRejectionNote, setQuoteRejectionNote] = useState("");
  const [savingQuote, setSavingQuote] = useState(false);

  // Payment state
  const [paymentModal, setPaymentModal] = useState(false);
  const [paymentRequest, setPaymentRequest] = useState(null);
  const [paymentNote, setPaymentNote] = useState("");
  const [savingPayment, setSavingPayment] = useState(false);

  const fetchRequests = async () => {
    try {
      const filter = filterStatus ? `?status=${encodeURIComponent(filterStatus)}` : "";
      const { data } = await api.get(`/owner/maintenance${filter}`);
      setRequests(data.requests);
    } catch {
      toast.error("Failed to load requests.");
    } finally {
      setLoading(false);
    }
  };

  const fetchVendors = async () => {
    try {
      const { data } = await api.get("/owner/vendors");
      setVendors(data.vendors || []);
    } catch {
      toast.error("Failed to load vendors.");
    }
  };

  useEffect(() => { fetchRequests(); }, [filterStatus]);
  useEffect(() => { fetchVendors(); }, []);

  const openCommentModal = (req) => {
    setSelectedRequest(req);
    setNewStatus(req.status);
    setComment("");
    setCommentModal(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch(`/owner/maintenance/${selectedRequest._id}/status`, {
        status: newStatus,
        comment: comment || undefined,
      });
      toast.success("Request updated.");
      setCommentModal(false);
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleAssignVendor = async (requestId, vendorId) => {
    if (!requestId) {
      toast.error("Select a maintenance request first.");
      return;
    }
    setAssigningVendorId(requestId);
    try {
      await api.patch(`/owner/maintenance/${requestId}/assign-vendor`, {
        vendorId: vendorId || undefined,
      });
      toast.success(vendorId ? "Vendor assigned." : "Vendor unassigned.");
      setVendorModalOpen(false);
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to assign vendor.");
    } finally {
      setAssigningVendorId("");
    }
  };

  const openQuoteDecisionModal = (req, decision) => {
    setQuoteDecisionRequest(req);
    setQuoteDecision(decision);
    setQuoteRejectionNote("");
    setQuoteDecisionModal(true);
  };

  const handleQuoteDecision = async (e) => {
    e.preventDefault();
    setSavingQuote(true);
    try {
      await api.patch(`/owner/maintenance/${quoteDecisionRequest._id}/quote-decision`, {
        decision: quoteDecision,
        rejectionNote: quoteRejectionNote || undefined,
      });
      toast.success(`Quote ${quoteDecision.toLowerCase()}.`);
      setQuoteDecisionModal(false);
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update quote.");
    } finally {
      setSavingQuote(false);
    }
  };

  const openPaymentModal = (req) => {
    setPaymentRequest(req);
    setPaymentNote("");
    setPaymentModal(true);
  };

  const handleCompletePayment = async (e) => {
    e.preventDefault();
    setSavingPayment(true);
    try {
      await api.patch(`/owner/maintenance/${paymentRequest._id}/complete-payment`, {
        paymentNote: paymentNote || undefined,
      });
      toast.success("Payment marked as completed!");
      setPaymentModal(false);
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to complete payment.");
    } finally {
      setSavingPayment(false);
    }
  };

  const openCount = requests.filter((r) => r.status === "Open").length;
  const inProgressCount = requests.filter((r) => r.status === "In Progress").length;
  const resolvedCount = requests.filter((r) => r.status === "Resolved").length;
  const activeTile = filterStatus || "All";
  const selectedRequestData = requests.find((r) => r._id === selectedRequestForAssignment);
  const selectedVendorData = vendors.find((v) => v._id === selectedVendorId);

  const openVendorModal = (requestId) => {
    setSelectedRequestForAssignment(requestId);
    const req = requests.find((r) => r._id === requestId);
    setSelectedVendorId(req?.assignedVendor?._id || "");
    setVendorSearch("");
    setVendorCategoryFilter("All");
    setVendorModalOpen(true);
  };

  const filteredVendorDirectory = vendors.filter((v) => {
    const matchesSearch =
      !vendorSearch ||
      v.name?.toLowerCase().includes(vendorSearch.toLowerCase()) ||
      v.city?.toLowerCase().includes(vendorSearch.toLowerCase()) ||
      (v.specializations || []).join(" ").toLowerCase().includes(vendorSearch.toLowerCase());
    const matchesCategory =
      vendorCategoryFilter === "All" || (v.specializations || []).includes(vendorCategoryFilter);
    return matchesSearch && matchesCategory;
  });

  const vendorCategoryCounts = useMemo(() => {
    const counts = {};
    CATEGORY_META.forEach(({ key }) => {
      counts[key] = key === "All"
        ? vendors.length
        : vendors.filter((v) => (v.specializations || []).includes(key)).length;
    });
    return counts;
  }, [vendors]);

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Maintenance Requests"
        subtitle="View and manage tenant maintenance requests"
      />

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-emerald-900 to-teal-900 px-6 py-7 sm:px-8 shadow-xl">
        <div className="absolute -top-12 -right-10 h-28 w-28 rounded-full bg-emerald-400/20 blur-2xl" />
        <div className="absolute -bottom-12 -left-10 h-32 w-32 rounded-full bg-teal-400/20 blur-2xl" />
        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-4 text-white">
          <div className="md:col-span-2">
            <p className="text-xs uppercase tracking-[0.16em] text-emerald-200 font-semibold">Service Control</p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold">Keep every issue visible, tracked, and resolved</h2>
            <p className="mt-2 text-sm text-emerald-100 max-w-xl">
              Prioritize urgent tickets, track progress in real time, and maintain a clear response history.
            </p>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
            <p className="text-xs uppercase tracking-wider text-emerald-200 font-semibold">Total Tickets</p>
            <p className="mt-2 text-3xl font-extrabold">{requests.length}</p>
            <p className="mt-1 text-xs text-emerald-100">Open + In progress + Resolved</p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => setFilterStatus("Open")}
          className={`rounded-2xl border p-5 shadow-sm text-left transition-all ${
            activeTile === "Open"
              ? "border-red-300 bg-red-50/60 ring-2 ring-red-200"
              : "border-gray-100 bg-white hover:shadow-md"
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Open</p>
          <p className="mt-2 text-3xl font-extrabold text-red-700">{openCount}</p>
          <p className="text-xs text-gray-500 mt-1">Requires attention</p>
        </button>
        <button
          type="button"
          onClick={() => setFilterStatus("In Progress")}
          className={`rounded-2xl border p-5 shadow-sm text-left transition-all ${
            activeTile === "In Progress"
              ? "border-amber-300 bg-amber-50/60 ring-2 ring-amber-200"
              : "border-gray-100 bg-white hover:shadow-md"
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">In Progress</p>
          <p className="mt-2 text-3xl font-extrabold text-amber-700">{inProgressCount}</p>
          <p className="text-xs text-gray-500 mt-1">Being handled</p>
        </button>
        <button
          type="button"
          onClick={() => setFilterStatus("Resolved")}
          className={`rounded-2xl border p-5 shadow-sm text-left transition-all ${
            activeTile === "Resolved"
              ? "border-emerald-300 bg-emerald-50/60 ring-2 ring-emerald-200"
              : "border-gray-100 bg-white hover:shadow-md"
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Resolved</p>
          <p className="mt-2 text-3xl font-extrabold text-emerald-700">{resolvedCount}</p>
          <p className="text-xs text-gray-500 mt-1">Completed successfully</p>
        </button>
        <button
          type="button"
          onClick={() => setFilterStatus("")}
          className={`rounded-2xl border p-5 shadow-sm text-left transition-all ${
            activeTile === "All"
              ? "border-blue-300 bg-blue-50/60 ring-2 ring-blue-200"
              : "border-gray-100 bg-white hover:shadow-md"
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">All Tickets</p>
          <p className="mt-2 text-3xl font-extrabold text-gray-900">
            {requests.length ? Math.round((resolvedCount / requests.length) * 100) : 0}%
          </p>
          <p className="text-xs text-gray-500 mt-1">Resolution ratio (click to show all)</p>
        </button>
      </div>

      {requests.length === 0 ? (
        <EmptyState message="No maintenance requests." icon={Wrench} />
      ) : (
        <div className="space-y-4">
          {requests.map((r) => (
            <div key={r._id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-gray-900 text-base inline-flex items-center gap-1.5">
                      {r.status === "Open" && <AlertTriangle size={14} className="text-red-600" />}
                      {r.status === "In Progress" && <Clock3 size={14} className="text-amber-600" />}
                      {r.status === "Resolved" && <CheckCircle2 size={14} className="text-green-600" />}
                      {r.category}
                    </span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${getUrgencyPill(r.urgency)}`}>
                      {r.urgency || "Medium"}
                    </span>
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="text-sm text-gray-600">{r.description}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 pt-1">
                    <span className="inline-flex items-center gap-1"><User size={12} /> Tenant: {r.tenant?.name} ({r.tenant?.email})</span>
                    <span className="inline-flex items-center gap-1"><MapPin size={12} /> {r.property?.propertyType}, {r.property?.address?.city}</span>
                    <span className="inline-flex items-center gap-1"><CalendarDays size={12} /> Filed: {new Date(r.createdAt).toLocaleDateString()}</span>
                  </div>

                  <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700 inline-flex items-center gap-1.5">
                        <BriefcaseBusiness size={13} /> Assigned Vendor
                      </p>
                      <div className="flex items-center gap-2">
                        {r.assignedVendor && (
                          <button
                            type="button"
                            disabled={assigningVendorId === r._id}
                            onClick={() => handleAssignVendor(r._id, "")}
                            className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                          >
                            {assigningVendorId === r._id ? "Removing..." : "Remove Vendor"}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openVendorModal(r._id)}
                          className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${
                            r.assignedVendor
                              ? "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
                              : "border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-100"
                          }`}
                        >
                          {r.assignedVendor ? "Change Vendor" : "Assign Vendor"}
                        </button>
                      </div>
                    </div>

                    {r.assignedVendor ? (
                      <div className="mt-2 text-xs text-gray-700 space-y-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2">
                        <p className="font-semibold">{r.assignedVendor.name}</p>
                        <p className="inline-flex items-center gap-1"><Phone size={12} /> {r.assignedVendor.phone}</p>
                        {r.assignedVendor.email && <p className="inline-flex items-center gap-1"><Mail size={12} /> {r.assignedVendor.email}</p>}
                      </div>
                    ) : (
                      <p className="mt-2 text-xs font-semibold text-amber-700">No vendor assigned yet.</p>
                    )}
                  </div>

                  {/* ── Vendor Quote Panel ── */}
                  {r.assignedVendor && r.quoteStatus !== "NotSubmitted" && (
                    <div className={`mt-3 rounded-xl border p-3 ${
                      r.quoteStatus === "Pending" ? "border-yellow-200 bg-yellow-50/60" :
                      r.quoteStatus === "Approved" ? "border-emerald-200 bg-emerald-50/60" :
                      "border-red-200 bg-red-50/60"
                    }`}>
                      <p className={`text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5 ${
                        r.quoteStatus === "Pending" ? "text-yellow-700" :
                        r.quoteStatus === "Approved" ? "text-emerald-700" : "text-red-700"
                      }`}>
                        <ClipboardList size={12} /> Vendor Quote — {r.quoteStatus}
                      </p>
                      {r.vendorQuote?.amount && (
                        <div className="mt-1.5 space-y-0.5">
                          <p className="text-sm font-bold text-gray-900">
                            ₹{Number(r.vendorQuote.amount).toLocaleString("en-IN")}
                          </p>
                          <p className="text-xs text-gray-600">{r.vendorQuote.description}</p>
                        </div>
                      )}
                      {r.quoteStatus === "Pending" && (
                        <div className="mt-2 flex gap-2">
                          <button
                            type="button"
                            onClick={() => openQuoteDecisionModal(r, "Approved")}
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                          >
                            <ThumbsUp size={11} /> Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => openQuoteDecisionModal(r, "Rejected")}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100"
                          >
                            <ThumbsDown size={11} /> Reject
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Vendor Work Photos ── */}
                  {r.vendorWorkPhotos?.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide flex items-center gap-1.5">
                        <Camera size={12} /> Vendor Work Photos
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {r.vendorWorkPhotos.map((photo, idx) => (
                          <a key={`vp-${idx}`} href={toAssetUrl(photo)} target="_blank" rel="noreferrer" className="block rounded-lg overflow-hidden border border-indigo-200 bg-indigo-50">
                            <img src={toAssetUrl(photo)} alt={`Work photo ${idx + 1}`} className="h-20 w-full object-cover" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── Vendor Payment Request ── */}
                  {r.vendorPaymentRequest?.status && r.vendorPaymentRequest.status !== "NotRaised" && (
                    <div className={`mt-3 rounded-xl border p-3 ${
                      r.vendorPaymentRequest.status === "Paid" ? "border-emerald-200 bg-emerald-50/60" : "border-amber-200 bg-amber-50/60"
                    }`}>
                      <p className={`text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5 ${
                        r.vendorPaymentRequest.status === "Paid" ? "text-emerald-700" : "text-amber-700"
                      }`}>
                        <BadgeIndianRupee size={12} /> Payment Request — {r.vendorPaymentRequest.status}
                      </p>
                      <div className="mt-1.5 space-y-0.5">
                        <p className="text-sm font-bold text-gray-900">
                          ₹{Number(r.vendorPaymentRequest.amount).toLocaleString("en-IN")}
                        </p>
                        {r.vendorPaymentRequest.description && (
                          <p className="text-xs text-gray-600">{r.vendorPaymentRequest.description}</p>
                        )}
                      </div>
                      {r.vendorPaymentRequest.status === "Pending" && (
                        <button
                          type="button"
                          onClick={() => openPaymentModal(r)}
                          className="mt-2 inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700"
                        >
                          <IndianRupee size={11} /> Mark Payment Done
                        </button>
                      )}
                      {r.vendorPaymentRequest.status === "Paid" && (
                        <p className="mt-1.5 text-xs font-semibold text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 size={11} /> Payment completed
                        </p>
                      )}
                    </div>
                  )}

                  {r.photos?.length > 0 && (
                    <div className="pt-2">
                      <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Tenant Photos</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {r.photos.map((photo, idx) => (
                          <a
                            key={`${photo}-${idx}`}
                            href={toAssetUrl(photo)}
                            target="_blank"
                            rel="noreferrer"
                            className="block rounded-lg overflow-hidden border border-gray-200 bg-gray-50"
                          >
                            <img
                              src={toAssetUrl(photo)}
                              alt={`Tenant upload ${idx + 1}`}
                              className="h-20 w-full object-cover"
                            />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {r.comments?.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Comments</p>
                      {r.comments.map((c, i) => (
                        <div key={i} className="bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-700 border border-gray-100">
                          <div className="flex items-center justify-between gap-3 mb-0.5">
                            <span className="font-medium text-gray-700">{c.addedBy?.name || "User"}</span>
                            <span className="text-xs text-gray-400">{new Date(c.addedAt).toLocaleDateString()}</span>
                          </div>
                          <p>{c.text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => openCommentModal(r)}
                  className="btn-secondary flex items-center gap-1.5 text-sm py-1.5 px-3 whitespace-nowrap h-fit"
                >
                  <MessageSquare size={14} /> Update
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Quote Decision Modal ── */}
      <Modal
        isOpen={quoteDecisionModal}
        onClose={() => setQuoteDecisionModal(false)}
        title={quoteDecision === "Approved" ? "Approve Vendor Quote" : "Reject Vendor Quote"}
      >
        {quoteDecisionRequest && (
          <form onSubmit={handleQuoteDecision} className="space-y-4">
            <div className={`rounded-xl border p-4 ${quoteDecision === "Approved" ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
              <p className="text-sm font-semibold text-gray-900">{quoteDecisionRequest.assignedVendor?.name}</p>
              <p className="text-xl font-extrabold mt-1">
                ₹{Number(quoteDecisionRequest.vendorQuote?.amount).toLocaleString("en-IN")}
              </p>
              <p className="text-xs text-gray-600 mt-0.5">{quoteDecisionRequest.vendorQuote?.description}</p>
            </div>
            {quoteDecision === "Rejected" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rejection Note (optional)</label>
                <textarea
                  rows={3}
                  value={quoteRejectionNote}
                  onChange={(e) => setQuoteRejectionNote(e.target.value)}
                  placeholder="Explain why the quote is being rejected..."
                  className="input-field w-full resize-none"
                />
              </div>
            )}
            {quoteDecision === "Approved" && (
              <p className="text-sm text-gray-600">
                By approving, the vendor will be notified to proceed with the work.
              </p>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setQuoteDecisionModal(false)} className="btn-secondary">Cancel</button>
              <button
                type="submit"
                disabled={savingQuote}
                className={`inline-flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-bold text-white disabled:opacity-60 ${
                  quoteDecision === "Approved" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {savingQuote ? <Loader2 size={14} className="animate-spin" /> : null}
                {savingQuote ? "Saving…" : quoteDecision === "Approved" ? "Approve Quote" : "Reject Quote"}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ── Payment Modal ── */}
      <Modal isOpen={paymentModal} onClose={() => setPaymentModal(false)} title="Mark Vendor Payment Complete">
        {paymentRequest && (
          <form onSubmit={handleCompletePayment} className="space-y-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-gray-900">{paymentRequest.assignedVendor?.name}</p>
              <p className="text-xl font-extrabold mt-1">
                ₹{Number(paymentRequest.vendorPaymentRequest?.amount).toLocaleString("en-IN")}
              </p>
              {paymentRequest.vendorPaymentRequest?.description && (
                <p className="text-xs text-gray-600 mt-0.5">{paymentRequest.vendorPaymentRequest.description}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Note (optional)</label>
              <input
                type="text"
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                placeholder="e.g. Paid via UPI ref #12345"
                className="input-field w-full"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setPaymentModal(false)} className="btn-secondary">Cancel</button>
              <button
                type="submit"
                disabled={savingPayment}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2 text-sm font-bold text-white hover:bg-amber-700 disabled:opacity-60"
              >
                {savingPayment ? <Loader2 size={14} className="animate-spin" /> : <IndianRupee size={14} />}
                {savingPayment ? "Saving…" : "Confirm Payment"}
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal isOpen={vendorModalOpen} onClose={() => setVendorModalOpen(false)} title={selectedRequestData?.assignedVendor ? "Change Vendor" : "Assign Vendor"} size="4xl">        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <aside className="lg:col-span-5 rounded-xl border border-gray-200 bg-gray-50/60 p-3 space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Communication Panel</p>
              <p className="text-sm font-semibold text-gray-900 mt-1">Vendors Directory</p>
            </div>

            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={vendorSearch}
                onChange={(e) => setVendorSearch(e.target.value)}
                placeholder="Search vendor, city, skill"
                className="input-field"
                style={{ paddingLeft: "2rem" }}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATEGORY_META.map(({ key, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setVendorCategoryFilter(key)}
                  className={`px-2 py-1.5 rounded-lg border text-[11px] font-semibold transition-all flex items-center justify-between gap-1 ${
                    vendorCategoryFilter === key
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                      : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300"
                  }`}
                >
                  <span className="inline-flex items-center gap-1 min-w-0">
                    <Icon size={12} className="shrink-0" />
                    <span className="truncate">{key}</span>
                  </span>
                  <span className={`text-[10px] px-1 py-0.5 rounded-full font-bold ${
                    vendorCategoryFilter === key ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"
                  }`}>
                    {vendorCategoryCounts[key]}
                  </span>
                </button>
              ))}
            </div>

            <div className="max-h-[420px] overflow-y-auto space-y-2 pr-1">
              {vendors.length === 0 ? (
                <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  Vendor directory is currently unavailable.
                </div>
              ) : filteredVendorDirectory.length === 0 ? (
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                  No vendors match your filter.
                </div>
              ) : (
                filteredVendorDirectory.map((v) => (
                  <button
                    key={v._id}
                    type="button"
                    onClick={() => setSelectedVendorId(v._id)}
                    className={`w-full text-left rounded-xl border p-3 transition-all ${
                      selectedVendorId === v._id
                        ? "border-indigo-300 bg-indigo-50 ring-2 ring-indigo-100"
                        : selectedRequestData?.assignedVendor?._id === v._id
                          ? "border-emerald-300 bg-emerald-50 hover:border-emerald-300"
                          : "border-gray-200 bg-white hover:border-indigo-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{v.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{(v.specializations || []).join(", ") || "General"}</p>
                      </div>
                      {v.city && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 border border-gray-200 text-gray-600">
                          {v.city}
                        </span>
                      )}
                    </div>
                    {selectedRequestData?.assignedVendor?._id === v._id && (
                      <p className="mt-2 inline-flex items-center rounded-full border border-emerald-300 bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                        Currently Assigned
                      </p>
                    )}
                  </button>
                ))
              )}
            </div>
          </aside>

          <div className="lg:col-span-7 space-y-4">
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Selected Request</p>
              {selectedRequestData ? (
                <div className="mt-2 space-y-1.5">
                  <p className="text-sm font-semibold text-gray-900">{selectedRequestData.category}</p>
                  <p className="text-xs text-gray-600">{selectedRequestData.description}</p>
                  <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                    <span className="inline-flex items-center gap-1"><MapPin size={12} /> {selectedRequestData.property?.address?.city || "N/A"}</span>
                    <span className="inline-flex items-center gap-1"><User size={12} /> {selectedRequestData.tenant?.name || "Tenant"}</span>
                  </div>
                  {selectedRequestData.assignedVendor ? (
                    <p className="inline-flex items-center rounded-full border border-emerald-300 bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                      Assigned: {selectedRequestData.assignedVendor.name}
                    </p>
                  ) : (
                    <p className="inline-flex items-center rounded-full border border-amber-200 bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
                      Vendor not assigned
                    </p>
                  )}
                </div>
              ) : (
                <p className="mt-2 text-xs text-indigo-700">No request selected.</p>
              )}
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Vendor Details</p>
              {selectedVendorData ? (
                <div className="mt-2 space-y-2">
                  <p className="text-base font-bold text-gray-900">{selectedVendorData.name}</p>
                  <p className="text-xs text-gray-500">{(selectedVendorData.specializations || []).join(", ") || "General"}</p>
                  <div className="space-y-1 text-xs text-gray-700">
                    <p className="inline-flex items-center gap-1.5"><Phone size={12} /> {selectedVendorData.phone}</p>
                    {selectedVendorData.email && <p className="inline-flex items-center gap-1.5"><Mail size={12} /> {selectedVendorData.email}</p>}
                    {selectedVendorData.city && <p className="inline-flex items-center gap-1.5"><MapPin size={12} /> {selectedVendorData.city}</p>}
                  </div>
                  <div className="pt-2 flex flex-wrap gap-2">
                    <a
                      href={`tel:${String(selectedVendorData.phone || "").replace(/\s+/g, "")}`}
                      className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                    >
                      <Phone size={12} /> Call
                    </a>
                    {selectedVendorData.email && (
                      <a
                        href={`mailto:${selectedVendorData.email}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                      >
                        <Mail size={12} /> Email
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-sm text-gray-500">Select a vendor from the left list to see details.</p>
              )}
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={!selectedRequestData?.assignedVendor || assigningVendorId === selectedRequestData?._id}
                onClick={() => handleAssignVendor(selectedRequestData?._id, "")}
                className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
              >
                Remove Assigned Vendor
              </button>
              <button
                type="button"
                disabled={!selectedRequestData || !selectedVendorData || assigningVendorId === selectedRequestData?._id}
                onClick={() => handleAssignVendor(selectedRequestData?._id, selectedVendorData?._id)}
                className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {assigningVendorId === selectedRequestData?._id
                  ? "Saving..."
                  : selectedRequestData?.assignedVendor
                    ? "Change to Selected Vendor"
                    : "Assign Selected Vendor"}
              </button>
            </div>
          </div>
        </div>
      </Modal>

      <Modal isOpen={commentModal} onClose={() => setCommentModal(false)} title="Update Request">
        {selectedRequest && (
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className="input-field">
                {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Add Comment (optional)</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                className="input-field"
                placeholder="Write a comment or update..."
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setCommentModal(false)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary">{saving ? "Saving..." : "Update"}</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default Maintenance;
