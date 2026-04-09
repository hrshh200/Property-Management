import React, { useEffect, useState } from "react";
import {
  Wrench,
  MessageSquare,
  AlertTriangle,
  Clock3,
  CheckCircle2,
  MapPin,
  User,
  CalendarDays,
} from "lucide-react";
import { PageHeader, Modal, StatusBadge, EmptyState } from "../../components/UI";
import api from "../../utils/api";
import toast from "react-hot-toast";

const STATUS_OPTIONS = ["Open", "In Progress", "Resolved"];
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
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [commentModal, setCommentModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [comment, setComment] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [saving, setSaving] = useState(false);

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

  useEffect(() => { fetchRequests(); }, [filterStatus]);

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

  const openCount = requests.filter((r) => r.status === "Open").length;
  const inProgressCount = requests.filter((r) => r.status === "In Progress").length;
  const resolvedCount = requests.filter((r) => r.status === "Resolved").length;
  const activeTile = filterStatus || "All";

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
