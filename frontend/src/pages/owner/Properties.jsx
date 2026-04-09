import React, { useEffect, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Home,
  Search,
  Building2,
  MapPin,
  CheckCircle2,
  DoorOpen,
  Filter,
} from "lucide-react";
import { PageHeader, Modal, StatusBadge, EmptyState } from "../../components/UI";
import api from "../../utils/api";
import toast from "react-hot-toast";

const PROPERTY_TYPES = ["Home", "Flat", "Office", "Shop"];

const emptyForm = {
  propertyType: "Home",
  address: { street: "", city: "", state: "", pincode: "" },
  description: "",
  numberOfRooms: 1,
};

const typeIconMap = {
  Home,
  Flat: Building2,
  Office: Building2,
  Shop: StoreIcon,
};

function StoreIcon(props) {
  return <Building2 {...props} />;
}

const Properties = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");

  const fetchProperties = async () => {
    try {
      const { data } = await api.get("/owner/properties");
      setProperties(data.properties);
    } catch {
      toast.error("Failed to load properties.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProperties(); }, []);

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setModalOpen(true); };

  const openEdit = (p) => {
    setForm({
      propertyType: p.propertyType,
      address: { ...p.address },
      description: p.description || "",
      numberOfRooms: p.numberOfRooms,
    });
    setEditingId(p._id);
    setModalOpen(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (["street", "city", "state", "pincode"].includes(name)) {
      setForm((f) => ({ ...f, address: { ...f.address, [name]: value } }));
    } else {
      setForm((f) => ({ ...f, [name]: value }));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/owner/properties/${editingId}`, form);
        toast.success("Property updated.");
      } else {
        await api.post("/owner/properties", form);
        toast.success("Property added.");
      }
      setModalOpen(false);
      fetchProperties();
    } catch (err) {
      toast.error(err.response?.data?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this property?")) return;
    try {
      await api.delete(`/owner/properties/${id}`);
      toast.success("Property deleted.");
      fetchProperties();
    } catch {
      toast.error("Delete failed.");
    }
  };

  const normalizedSearch = search.trim().toLowerCase();
  const filteredProperties = properties.filter((p) => {
    const addressText = `${p.address?.street || ""} ${p.address?.city || ""} ${p.address?.state || ""} ${p.address?.pincode || ""}`.toLowerCase();
    const matchesSearch = !normalizedSearch || p.propertyType.toLowerCase().includes(normalizedSearch) || addressText.includes(normalizedSearch);
    const matchesType = typeFilter === "All" || p.propertyType === typeFilter;
    return matchesSearch && matchesType;
  });

  const total = properties.length;
  const occupied = properties.filter((p) => p.status === "Occupied").length;
  const vacant = properties.filter((p) => p.status === "Vacant").length;
  const totalRooms = properties.reduce((sum, p) => sum + Number(p.numberOfRooms || 0), 0);
  const occupancyRate = total > 0 ? Math.round((occupied / total) * 100) : 0;

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Properties"
        subtitle="Manage and monitor your portfolio with smart controls"
        action={
          <button onClick={openAdd} className="btn-primary flex items-center gap-2 shadow-sm">
            <Plus size={16} /> Add Property
          </button>
        }
      />

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-cyan-900 via-blue-900 to-indigo-900 px-6 py-7 sm:px-8 shadow-xl">
        <div className="absolute -top-10 -right-8 h-28 w-28 rounded-full bg-cyan-400/20 blur-2xl" />
        <div className="absolute -bottom-10 -left-8 h-32 w-32 rounded-full bg-indigo-400/20 blur-2xl" />
        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-4 text-white">
          <div className="md:col-span-2">
            <p className="text-xs uppercase tracking-[0.16em] text-cyan-200 font-semibold">Portfolio Intelligence</p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold">Your real estate inventory, beautifully organized</h2>
            <p className="mt-2 text-sm text-blue-100 max-w-xl">
              Track occupancy and unit capacity instantly, then drill down into each property with clear actions.
            </p>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
            <p className="text-xs uppercase tracking-wider text-blue-200 font-semibold">Occupancy</p>
            <p className="mt-2 text-3xl font-extrabold">{occupancyRate}%</p>
            <p className="mt-1 text-xs text-emerald-300 flex items-center gap-1">
              <CheckCircle2 size={14} /> {occupied} occupied, {vacant} vacant
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Total Properties</p>
          <p className="mt-2 text-3xl font-extrabold text-gray-900">{total}</p>
          <p className="text-xs text-gray-500 mt-1">Across all types</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Occupied</p>
          <p className="mt-2 text-3xl font-extrabold text-blue-700">{occupied}</p>
          <p className="text-xs text-gray-500 mt-1">Currently active</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Vacant</p>
          <p className="mt-2 text-3xl font-extrabold text-gray-800">{vacant}</p>
          <p className="text-xs text-gray-500 mt-1">Ready to lease</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Total Rooms / Units</p>
          <p className="mt-2 text-3xl font-extrabold text-emerald-700">{totalRooms}</p>
          <p className="text-xs text-gray-500 mt-1">Portfolio capacity</p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2 flex items-center rounded-lg border border-gray-300 overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
            <div className="h-full px-3 py-2.5 bg-gray-50 border-r border-gray-200 text-gray-500 flex items-center">
              <Search size={16} />
            </div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by type or address"
              className="w-full px-3 py-2.5 text-sm text-gray-700 bg-white outline-none"
            />
          </div>
          <div className="flex items-center rounded-lg border border-gray-300 overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
            <div className="h-full px-3 py-2.5 bg-gray-50 border-r border-gray-200 text-gray-500 flex items-center">
              <Filter size={16} />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2.5 text-sm text-gray-700 bg-white outline-none"
            >
              <option value="All">All Property Types</option>
              {PROPERTY_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {filteredProperties.length === 0 ? (
        <EmptyState message="No properties yet. Add your first property." icon={Home} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredProperties.map((p) => {
            const TypeIcon = typeIconMap[p.propertyType] || Building2;
            return (
            <div key={p._id} className="group rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-2.5 py-1 text-blue-700 text-xs font-semibold mb-2">
                    <TypeIcon size={14} /> {p.propertyType}
                  </div>
                  <p className="text-sm text-gray-700 mt-0.5 flex items-start gap-1.5">
                    <MapPin size={14} className="mt-0.5 text-gray-400 shrink-0" />
                    <span>
                    {p.address.street}, {p.address.city}, {p.address.state}
                    {p.address.pincode ? ` - ${p.address.pincode}` : ""}
                    </span>
                  </p>
                </div>
                <StatusBadge status={p.status} />
              </div>
              {p.description ? (
                <p className="text-sm text-gray-600 mb-4 line-clamp-2 min-h-[40px]">{p.description}</p>
              ) : (
                <p className="text-sm text-gray-400 mb-4 min-h-[40px]">No description added.</p>
              )}

              <div className="mb-4 flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                <span className="text-xs text-gray-500">Capacity</span>
                <span className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                  <DoorOpen size={14} className="text-gray-500" />
                  {p.numberOfRooms} room{p.numberOfRooms !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="flex gap-2 pt-3 border-t border-gray-100">
                <button onClick={() => openEdit(p)} className="btn-secondary flex items-center gap-1.5 text-sm py-1.5 px-3">
                  <Pencil size={14} /> Edit
                </button>
                <button onClick={() => handleDelete(p._id)} className="btn-danger flex items-center gap-1.5 text-sm py-1.5 px-3">
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
          );})}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? "Edit Property" : "Add Property"}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Property Type</label>
            <select name="propertyType" value={form.propertyType} onChange={handleChange} className="input-field">
              {PROPERTY_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
              <input type="text" name="street" value={form.address.street} onChange={handleChange} required className="input-field" placeholder="123 Main St" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input type="text" name="city" value={form.address.city} onChange={handleChange} required className="input-field" placeholder="Mumbai" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <input type="text" name="state" value={form.address.state} onChange={handleChange} required className="input-field" placeholder="Maharashtra" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
              <input type="text" name="pincode" value={form.address.pincode} onChange={handleChange} className="input-field" placeholder="400001" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rooms / Units</label>
              <input type="number" name="numberOfRooms" value={form.numberOfRooms} onChange={handleChange} min={1} className="input-field" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea name="description" value={form.description} onChange={handleChange} rows={3} className="input-field" placeholder="Optional description..." />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? "Saving..." : "Save"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Properties;
