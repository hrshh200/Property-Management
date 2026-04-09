import React, { useEffect, useState } from "react";
import {
  Plus,
  Wrench,
  CalendarDays,
  MapPin,
  MessageSquare,
  ImagePlus,
  X,
} from "lucide-react";
import { PageHeader, Modal, StatusBadge, EmptyState } from "../../components/UI";
import api from "../../utils/api";
import toast from "react-hot-toast";

const CATEGORIES = ["Electric", "Plumbing", "General", "Carpentry", "Painting", "Other"];
const URGENCY_OPTIONS = ["Low", "Medium", "High", "Emergency"];
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

const TenantMaintenance = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addModal, setAddModal] = useState(false);
  const [form, setForm] = useState({ category: "General", urgency: "Medium", description: "" });
  const [photos, setPhotos] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [saving, setSaving] = useState(false);
  const [draftStatusFilter, setDraftStatusFilter] = useState("All");
  const [draftCategoryFilter, setDraftCategoryFilter] = useState("All");
  const [draftUrgencyFilter, setDraftUrgencyFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [urgencyFilter, setUrgencyFilter] = useState("All");

  const fetchRequests = async () => {
    try {
      const { data } = await api.get("/tenant/maintenance");
      setRequests(data.requests);
    } catch {
      toast.error("Failed to load requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = new FormData();
      payload.append("category", form.category);
      payload.append("urgency", form.urgency);
      payload.append("description", form.description);
      photos.forEach((file) => payload.append("photos", file));

      await api.post("/tenant/maintenance", payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Request submitted successfully.");
      setAddModal(false);
      setForm({ category: "General", urgency: "Medium", description: "" });
      setPhotos([]);
      setPhotoPreviews([]);
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit request.");
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoChange = (e) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;

    const combined = [...photos, ...selected].slice(0, 5);
    setPhotos(combined);

    const previews = combined.map((file) => ({
      name: file.name,
      url: URL.createObjectURL(file),
    }));
    setPhotoPreviews(previews);
  };

  const removePhotoAt = (index) => {
    const nextPhotos = photos.filter((_, i) => i !== index);
    const nextPreviews = photoPreviews.filter((_, i) => i !== index);
    setPhotos(nextPhotos);
    setPhotoPreviews(nextPreviews);
  };

  const visibleRequests = requests.filter((r) => {
    const matchesStatus = statusFilter === "All" || r.status === statusFilter;
    const matchesCategory = categoryFilter === "All" || r.category === categoryFilter;
    const matchesUrgency = urgencyFilter === "All" || (r.urgency || "Medium") === urgencyFilter;

    return matchesStatus && matchesCategory && matchesUrgency;
  });

  const hasActiveFilters = statusFilter !== "All" || categoryFilter !== "All" || urgencyFilter !== "All";

  const applyFilters = () => {
    setStatusFilter(draftStatusFilter);
    setCategoryFilter(draftCategoryFilter);
    setUrgencyFilter(draftUrgencyFilter);
  };

  const resetFilters = () => {
    setDraftStatusFilter("All");
    setDraftCategoryFilter("All");
    setDraftUrgencyFilter("All");
    setStatusFilter("All");
    setCategoryFilter("All");
    setUrgencyFilter("All");
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Maintenance Requests"
        subtitle="Raise and track your maintenance requests"
        action={
          <button onClick={() => setAddModal(true)} className="btn-primary flex items-center gap-2 shadow-sm">
            <Plus size={16} /> New Request
          </button>
        }
      />

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-emerald-900 to-teal-900 px-6 py-7 sm:px-8 shadow-xl">
        <div className="absolute -top-10 -right-8 h-28 w-28 rounded-full bg-emerald-400/20 blur-2xl" />
        <div className="absolute -bottom-10 -left-8 h-32 w-32 rounded-full bg-teal-400/20 blur-2xl" />
        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-4 text-white">
          <div className="md:col-span-2">
            <p className="text-xs uppercase tracking-[0.16em] text-emerald-200 font-semibold">Support Desk</p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold">Raise issues and track owner responses</h2>
            <p className="mt-2 text-sm text-emerald-100 max-w-xl">
              Submit requests with clear descriptions and follow every update from your owner in one timeline.
            </p>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
            <p className="text-xs uppercase tracking-wider text-emerald-200 font-semibold">Total Requests</p>
            <p className="mt-2 text-3xl font-extrabold">{requests.length}</p>
            <p className="mt-1 text-xs text-emerald-100">All statuses combined</p>
          </div>
        </div>
      </section>

      <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Request Filters</p>
            <h3 className="mt-1 text-lg font-bold text-gray-900">Filter by status, category and urgency</h3>
          </div>
          {hasActiveFilters ? (
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
              Active Filters
            </span>
          ) : null}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-red-50 border border-gray-100 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Status</p>
            <div className="flex flex-wrap gap-2">
              {["All", ...STATUS_OPTIONS].map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setDraftStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                    draftStatusFilter === status
                      ? "bg-red-600 border-red-600 text-white shadow-sm"
                      : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-emerald-50 border border-gray-100 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Category</p>
            <div className="flex flex-wrap gap-2">
              {["All", ...CATEGORIES].map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setDraftCategoryFilter(category)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                    draftCategoryFilter === category
                      ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                      : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50 border border-gray-100 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Urgency</p>
            <div className="flex flex-wrap gap-2">
              {["All", ...URGENCY_OPTIONS].map((urgency) => (
                <button
                  key={urgency}
                  type="button"
                  onClick={() => setDraftUrgencyFilter(urgency)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                    draftUrgencyFilter === urgency
                      ? "bg-emerald-600 border-emerald-600 text-white shadow-sm"
                      : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {urgency}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
          <button
            type="button"
            onClick={resetFilters}
            className="btn-secondary"
          >
            Reset Filters
          </button>
          <button
            type="button"
            onClick={applyFilters}
            className="btn-primary"
          >
            Apply Filters
          </button>
        </div>
      </div>

      {visibleRequests.length === 0 ? (
        <EmptyState message="No maintenance requests yet." icon={Wrench} />
      ) : (
        <div className="space-y-4">
          {visibleRequests.map((r) => (
            <div key={r._id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900 inline-flex items-center gap-1.5">
                      <MessageSquare size={14} className="text-blue-600" />
                      {r.category}
                    </span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${getUrgencyPill(r.urgency)}`}>
                      {r.urgency || "Medium"}
                    </span>
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="text-sm text-gray-600">{r.description}</p>
                  <p className="text-xs text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
                    <span className="inline-flex items-center gap-1"><CalendarDays size={12} /> Filed on {new Date(r.createdAt).toLocaleDateString()}</span>
                    <span className="inline-flex items-center gap-1"><MapPin size={12} /> {r.property?.propertyType}, {r.property?.address?.city}</span>
                  </p>

                  {r.photos?.length > 0 && (
                    <div className="pt-2">
                      <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Attached Photos</p>
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
                              alt={`Request evidence ${idx + 1}`}
                              className="h-20 w-full object-cover"
                            />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {r.comments?.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Updates from Owner</p>
                      {r.comments.map((c, i) => (
                        <div key={i} className="bg-blue-50 rounded-lg px-3 py-2 text-sm text-gray-700 border border-blue-100">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="font-medium text-blue-700">{c.addedBy?.name || "Owner"}</span>
                            <span className="text-xs text-gray-400">{new Date(c.addedAt).toLocaleDateString()}</span>
                          </div>
                          <p>{c.text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={addModal} onClose={() => setAddModal(false)} title="New Maintenance Request">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input-field">
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Urgency</label>
              <select value={form.urgency} onChange={(e) => setForm({ ...form, urgency: e.target.value })} className="input-field">
                {URGENCY_OPTIONS.map((u) => <option key={u}>{u}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              required
              rows={4}
              className="input-field"
              placeholder="Describe the issue in detail..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Upload Photos (optional, max 5)</label>
            <label className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-5 cursor-pointer hover:bg-gray-100 transition-colors">
              <ImagePlus size={16} className="text-gray-500" />
              <span className="text-sm text-gray-600">Choose image files</span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoChange}
                className="hidden"
              />
            </label>
            <p className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP up to 5MB each.</p>

            {photoPreviews.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
                {photoPreviews.map((preview, idx) => (
                  <div key={`${preview.name}-${idx}`} className="relative rounded-lg overflow-hidden border border-gray-200">
                    <img src={preview.url} alt={preview.name} className="h-24 w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhotoAt(idx)}
                      className="absolute top-1 right-1 bg-black/65 text-white rounded-full p-1"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setAddModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? "Submitting..." : "Submit"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default TenantMaintenance;
