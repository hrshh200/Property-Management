import React, { useEffect, useState } from "react";
import { DollarSign, Search, CalendarDays, MapPin, ReceiptText } from "lucide-react";
import { PageHeader, StatusBadge, EmptyState } from "../../components/UI";
import api from "../../utils/api";
import { formatCurrency } from "../../utils/currency";
import toast from "react-hot-toast";

const TenantRent = () => {
  const [rents, setRents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await api.get("/tenant/rent-history");
        setRents(data.rents);
      } catch {
        toast.error("Failed to load rent history.");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>;

  const pending = rents.filter((r) => r.status === "Pending").length;
  const overdue = rents.filter((r) => r.status === "Overdue").length;
  const paid = rents.filter((r) => r.status === "Paid").length;
  const totalAmount = rents.reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const paidAmount = rents.filter((r) => r.status === "Paid").reduce((sum, r) => sum + Number(r.amount || 0), 0);

  const normalizedSearch = search.trim().toLowerCase();
  const visibleRents = rents.filter((r) => {
    if (!normalizedSearch) return true;
    const haystack = [
      r.month,
      String(r.year),
      r.property?.propertyType,
      r.property?.address?.city,
      r.status,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(normalizedSearch);
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Rent & Payments" subtitle="Your rent records and payment history" />

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-blue-900 to-emerald-900 px-6 py-7 sm:px-8 shadow-xl">
        <div className="absolute -top-10 -right-8 h-28 w-28 rounded-full bg-emerald-400/20 blur-2xl" />
        <div className="absolute -bottom-10 -left-8 h-32 w-32 rounded-full bg-blue-400/20 blur-2xl" />
        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-4 text-white">
          <div className="md:col-span-2">
            <p className="text-xs uppercase tracking-[0.16em] text-cyan-200 font-semibold">Payment Timeline</p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold">Track every rent cycle clearly</h2>
            <p className="mt-2 text-sm text-blue-100 max-w-xl">
              Review due dates, payment completion and outstanding records from one clean timeline.
            </p>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
            <p className="text-xs uppercase tracking-wider text-cyan-200 font-semibold">Paid Amount</p>
            <p className="mt-2 text-3xl font-extrabold">{formatCurrency(paidAmount)}</p>
            <p className="mt-1 text-xs text-cyan-100">Out of {formatCurrency(totalAmount)} total rent</p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm text-center">
          <p className="text-2xl font-bold text-green-600">{paid}</p>
          <p className="text-sm text-gray-500">Paid</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm text-center">
          <p className="text-2xl font-bold text-yellow-600">{pending}</p>
          <p className="text-sm text-gray-500">Pending</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm text-center">
          <p className="text-2xl font-bold text-red-600">{overdue}</p>
          <p className="text-sm text-gray-500">Overdue</p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex items-center rounded-lg border border-gray-300 overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
          <div className="h-full px-3 py-2.5 bg-gray-50 border-r border-gray-200 text-gray-500 flex items-center">
            <Search size={16} />
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by month, year, property or status"
            className="w-full px-3 py-2.5 text-sm text-gray-700 bg-white outline-none"
          />
        </div>
      </div>

      {visibleRents.length === 0 ? (
        <EmptyState message="No rent records yet." icon={DollarSign} />
      ) : (
        <div className="rounded-2xl border border-gray-100 bg-white p-0 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr className="text-left">
                <th className="px-4 py-3 font-medium text-gray-600">Month / Year</th>
                <th className="px-4 py-3 font-medium text-gray-600">Property</th>
                <th className="px-4 py-3 font-medium text-gray-600">Amount</th>
                <th className="px-4 py-3 font-medium text-gray-600">Due Date</th>
                <th className="px-4 py-3 font-medium text-gray-600">Paid Date</th>
                <th className="px-4 py-3 font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {visibleRents.map((r) => (
                <tr key={r._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays size={13} className="text-gray-400" />
                      {r.month} {r.year}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin size={13} className="text-gray-400" />
                      {r.property?.propertyType} - {r.property?.address?.city}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{formatCurrency(r.amount)}</td>
                  <td className="px-4 py-3 text-gray-600">{new Date(r.dueDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {r.paidDate ? (
                      <span className="inline-flex items-center gap-1.5">
                        <ReceiptText size={13} className="text-gray-400" />
                        {new Date(r.paidDate).toLocaleDateString()}
                      </span>
                    ) : "-"}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default TenantRent;
