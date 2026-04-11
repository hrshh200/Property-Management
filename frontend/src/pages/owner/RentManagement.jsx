import React, { useEffect, useState } from "react";
import {
  Plus,
  CheckCircle,
  AlertCircle,
  DollarSign,
  Search,
  Wallet,
  Clock3,
  ReceiptText,
  CalendarDays,
  Download,
} from "lucide-react";
import { PageHeader, Modal, StatusBadge, EmptyState } from "../../components/UI";
import api from "../../utils/api";
import { formatCurrency } from "../../utils/currency";
import toast from "react-hot-toast";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const currentYear = new Date().getFullYear();
const YEARS = [currentYear - 1, currentYear, currentYear + 1];

const RentManagement = () => {
  const [rents, setRents] = useState([]);
  const [leases, setLeases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addModal, setAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    leaseId: "",
    month: MONTHS[new Date().getMonth()],
    year: String(currentYear),
    dueDate: "",
    notes: "",
  });

  const fetchData = async () => {
    try {
      const filter = filterStatus ? `?status=${filterStatus}` : "";
      const [rentsRes, leasesRes] = await Promise.all([
        api.get(`/owner/rent${filter}`),
        api.get("/owner/leases"),
      ]);
      setRents(rentsRes.data.rents);
      setLeases(leasesRes.data.leases);
    } catch {
      toast.error("Failed to load rent data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [filterStatus]);

  const handleGenerate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/owner/rent", form);
      toast.success("Rent record created.");
      setAddModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create rent record.");
    } finally {
      setSaving(false);
    }
  };

  const markPaid = async (id) => {
    try {
      await api.patch(`/owner/rent/${id}/paid`, { paidDate: new Date().toISOString() });
      toast.success("Marked as paid.");
      fetchData();
    } catch {
      toast.error("Failed to mark as paid.");
    }
  };

  const markOverdue = async () => {
    try {
      const { data } = await api.post("/owner/rent/mark-overdue");
      toast.success(data.message);
      fetchData();
    } catch {
      toast.error("Failed to mark overdue records.");
    }
  };

  const downloadReceipt = async (rentId) => {
    try {
      const response = await api.get(`/rent/${rentId}/receipt`, { responseType: "blob" });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `receipt-${rentId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("Unable to download receipt.");
    }
  };

  const exportRentCsv = async () => {
    try {
      const response = await api.get("/owner/rent/export", { responseType: "blob" });
      const blob = new Blob([response.data], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `owner-rent-${Date.now()}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("Unable to export rent data.");
    }
  };

  const paidCount = rents.filter((r) => r.status === "Paid").length;
  const pendingCount = rents.filter((r) => r.status === "Pending").length;
  const overdueCount = rents.filter((r) => r.status === "Overdue").length;
  const totalAmount = rents.reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const paidAmount = rents
    .filter((r) => r.status === "Paid")
    .reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const normalizedSearch = search.trim().toLowerCase();

  const visibleRents = rents.filter((r) => {
    if (!normalizedSearch) return true;
    const haystack = [
      r.tenant?.name,
      r.tenant?.email,
      r.property?.propertyType,
      r.property?.address?.city,
      r.month,
      String(r.year),
      r.status,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(normalizedSearch);
  });

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rent Management"
        subtitle="Track, generate and reconcile rent with confidence"
        action={
          <div className="flex gap-2">
            <button onClick={exportRentCsv} className="btn-secondary flex items-center gap-1.5 text-sm">
              <Download size={15} /> Export CSV
            </button>
            <button onClick={markOverdue} className="btn-secondary flex items-center gap-1.5 text-sm">
              <AlertCircle size={15} /> Mark Overdue
            </button>
            <button onClick={() => setAddModal(true)} className="btn-primary flex items-center gap-2 shadow-sm">
              <Plus size={16} /> Generate Rent
            </button>
          </div>
        }
      />

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-blue-900 to-emerald-900 px-6 py-7 sm:px-8 shadow-xl">
        <div className="absolute -top-10 -right-8 h-28 w-28 rounded-full bg-emerald-400/20 blur-2xl" />
        <div className="absolute -bottom-10 -left-8 h-32 w-32 rounded-full bg-blue-400/20 blur-2xl" />
        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-4 text-white">
          <div className="md:col-span-2">
            <p className="text-xs uppercase tracking-[0.16em] text-cyan-200 font-semibold">Revenue Hub</p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold">See payment health across all active leases</h2>
            <p className="mt-2 text-sm text-blue-100 max-w-xl">
              Monitor pending dues, recover overdue rents quickly, and keep every payment cycle transparent.
            </p>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
            <p className="text-xs uppercase tracking-wider text-cyan-200 font-semibold">Paid Collection</p>
            <p className="mt-2 text-3xl font-extrabold">{formatCurrency(paidAmount)}</p>
            <p className="mt-1 text-xs text-emerald-200">Out of {formatCurrency(totalAmount)} tracked rent</p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Paid Records</p>
          <p className="mt-2 text-3xl font-extrabold text-emerald-700">{paidCount}</p>
          <p className="text-xs text-gray-500 mt-1">Settled installments</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Pending</p>
          <p className="mt-2 text-3xl font-extrabold text-amber-700">{pendingCount}</p>
          <p className="text-xs text-gray-500 mt-1">Awaiting payment</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Overdue</p>
          <p className="mt-2 text-3xl font-extrabold text-red-700">{overdueCount}</p>
          <p className="text-xs text-gray-500 mt-1">Need follow-up</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Total Tracked</p>
          <p className="mt-2 text-3xl font-extrabold text-gray-900">{formatCurrency(totalAmount)}</p>
          <p className="text-xs text-gray-500 mt-1">This filtered dataset</p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm space-y-3">
        <div className="flex items-center rounded-lg border border-gray-300 overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
          <div className="h-full px-3 py-2.5 bg-gray-50 border-r border-gray-200 text-gray-500 flex items-center">
            <Search size={16} />
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tenant, property, month, year or status"
            className="w-full px-3 py-2.5 text-sm text-gray-700 bg-white outline-none"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["", "Pending", "Paid", "Overdue"].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${
                filterStatus === s
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              {s || "All"}
            </button>
          ))}
        </div>
      </div>

      {visibleRents.length === 0 ? (
        <EmptyState message="No rent records found." icon={DollarSign} />
      ) : (
        <div className="rounded-2xl border border-gray-100 bg-white p-0 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/90 border-b border-gray-100">
              <tr className="text-left">
                <th className="px-4 py-3 font-medium text-gray-600">Tenant</th>
                <th className="px-4 py-3 font-medium text-gray-600">Property</th>
                <th className="px-4 py-3 font-medium text-gray-600">Month / Year</th>
                <th className="px-4 py-3 font-medium text-gray-600">Amount</th>
                <th className="px-4 py-3 font-medium text-gray-600">Due Date</th>
                <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {visibleRents.map((r) => (
                <tr key={r._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{r.tenant?.name}</p>
                    <p className="text-gray-400 text-xs">{r.tenant?.email}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    <span className="inline-flex items-center gap-1.5">
                      <Wallet size={13} className="text-gray-400" />
                      {r.property?.propertyType} — {r.property?.address?.city}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays size={13} className="text-gray-400" />
                      {r.month} {r.year}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{formatCurrency(r.amount)}</td>
                  <td className="px-4 py-3 text-gray-600">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock3 size={13} className="text-gray-400" />
                      {new Date(r.dueDate).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3">
                    {r.status !== "Paid" && (
                      <button onClick={() => markPaid(r._id)} className="inline-flex items-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-2.5 py-1 text-green-700 hover:bg-green-100 text-xs font-semibold transition-colors">
                        <CheckCircle size={14} /> Mark Paid
                      </button>
                    )}
                    {r.status === "Paid" && r.paidDate && (
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                          <ReceiptText size={13} />
                          Paid {new Date(r.paidDate).toLocaleDateString()}
                        </span>
                        <button
                          type="button"
                          onClick={() => downloadReceipt(r._id)}
                          className="inline-flex w-fit items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-100"
                        >
                          <Download size={12} /> Receipt
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      <Modal isOpen={addModal} onClose={() => setAddModal(false)} title="Generate Rent Record">
        <form onSubmit={handleGenerate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lease</label>
            <select value={form.leaseId} onChange={(e) => setForm({ ...form, leaseId: e.target.value })} required className="input-field">
              <option value="">Select lease</option>
              {leases.map((l) => (
                <option key={l._id} value={l._id}>
                  {l.tenant?.name} — {l.property?.propertyType}, {l.property?.address?.city} ({formatCurrency(l.rentAmount)}/mo)
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
              <select value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} className="input-field">
                {MONTHS.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
              <select value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} className="input-field">
                {YEARS.map((y) => <option key={y}>{y}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
            <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} required className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <input type="text" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input-field" placeholder="Any notes..." />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setAddModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? "Generating..." : "Generate"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default RentManagement;
