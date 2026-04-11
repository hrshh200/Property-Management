import React, { useEffect, useState } from "react";
import { RefreshCcw, CheckCircle2, XCircle, Clock } from "lucide-react";
import { PageHeader, EmptyState } from "../../components/UI";
import api from "../../utils/api";
import { formatCurrency } from "../../utils/currency";
import toast from "react-hot-toast";

const LeaseRenewals = () => {
  const [renewals, setRenewals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");

  const fetchRenewals = async () => {
    try {
      const { data } = await api.get("/owner/renewals");
      setRenewals(data.renewals || []);
    } catch {
      toast.error("Failed to load renewals.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRenewals(); }, []);

  const cancelRenewal = async (id) => {
    try {
      await api.patch(`/owner/renewals/${id}/cancel`);
      toast.success("Renewal cancelled.");
      fetchRenewals();
    } catch {
      toast.error("Failed to cancel renewal.");
    }
  };

  const pendingCount = renewals.filter((r) => r.status === "Pending").length;
  const acceptedCount = renewals.filter((r) => r.status === "Accepted").length;
  const rejectedCount = renewals.filter((r) => r.status === "Rejected").length;
  const cancelledCount = renewals.filter((r) => r.status === "Cancelled").length;

  const FILTERS = ["All", "Pending", "Accepted", "Rejected", "Cancelled"];

  const filteredRenewals = filter === "All" ? renewals : renewals.filter((r) => r.status === filter);

  const groupedRenewals = filteredRenewals.reduce((acc, renewal) => {
    const propertyId = renewal.property?._id || "unknown-property";
    if (!acc[propertyId]) {
      acc[propertyId] = {
        property: renewal.property,
        renewals: [],
      };
    }
    acc[propertyId].renewals.push(renewal);
    return acc;
  }, {});

  const propertyGroups = Object.values(groupedRenewals).sort((a, b) => {
    const aPending = a.renewals.filter((r) => r.status === "Pending").length;
    const bPending = b.renewals.filter((r) => r.status === "Pending").length;
    if (bPending !== aPending) return bPending - aPending;
    const aName = `${a.property?.propertyType || "Property"} ${a.property?.address?.city || ""}`.trim();
    const bName = `${b.property?.propertyType || "Property"} ${b.property?.address?.city || ""}`.trim();
    return aName.localeCompare(bName);
  });

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lease Renewals"
        subtitle="Track all renewal proposals sent to tenants"
      />

      {/* Hero / Stats */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-800 via-teal-800 to-cyan-900 px-6 py-7 sm:px-8 shadow-xl">
        <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-emerald-400/20 blur-2xl" />
        <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-teal-400/20 blur-2xl" />
        <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-4 text-white">
          <div className="col-span-2 sm:col-span-1">
            <p className="text-xs uppercase tracking-widest text-emerald-200 font-semibold">Total</p>
            <p className="mt-2 text-4xl font-extrabold">{renewals.length}</p>
            <p className="mt-1 text-xs text-emerald-100">All proposals</p>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
            <p className="text-xs uppercase tracking-wider text-amber-200 font-semibold">Pending</p>
            <p className="mt-1 text-3xl font-extrabold text-amber-300">{pendingCount}</p>
            <p className="text-xs text-emerald-100 mt-1">Awaiting tenant</p>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
            <p className="text-xs uppercase tracking-wider text-emerald-200 font-semibold">Accepted</p>
            <p className="mt-1 text-3xl font-extrabold text-emerald-300">{acceptedCount}</p>
            <p className="text-xs text-emerald-100 mt-1">Tenant agreed</p>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
            <p className="text-xs uppercase tracking-wider text-red-200 font-semibold">Rejected</p>
            <p className="mt-1 text-3xl font-extrabold text-red-300">{rejectedCount}</p>
            <p className="text-xs text-emerald-100 mt-1">Declined by tenant</p>
          </div>
        </div>
      </section>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === f
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {f}
            {f !== "All" && (
              <span className={`ml-1.5 text-xs ${filter === f ? "text-emerald-100" : "text-gray-400"}`}>
                ({renewals.filter((r) => r.status === f).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Renewals grouped by property */}
      {filteredRenewals.length === 0 ? (
        <EmptyState message="No renewal proposals in this category." icon={RefreshCcw} />
      ) : (
        <div className="space-y-5">
          {propertyGroups.map((group, index) => {
            const pendingInProperty = group.renewals.filter((r) => r.status === "Pending").length;
            const acceptedInProperty = group.renewals.filter((r) => r.status === "Accepted").length;
            const rejectedInProperty = group.renewals.filter((r) => r.status === "Rejected").length;
            const cancelledInProperty = group.renewals.filter((r) => r.status === "Cancelled").length;

            return (
              <section key={group.property?._id || `property-group-${index}`} className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-slate-900 to-slate-700 px-5 py-4 text-white">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.15em] text-slate-300 font-semibold">Property</p>
                      <h3 className="mt-1 text-lg font-bold">
                        {group.property?.propertyType || "Property"}
                      </h3>
                      <p className="text-sm text-slate-200">
                        {group.property?.address?.street || "Address not available"}
                        {group.property?.address?.city ? `, ${group.property.address.city}` : ""}
                        {group.property?.address?.state ? `, ${group.property.address.state}` : ""}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide">
                      <span className="rounded-full bg-amber-400/20 px-2.5 py-1 text-amber-200">Pending {pendingInProperty}</span>
                      <span className="rounded-full bg-emerald-400/20 px-2.5 py-1 text-emerald-200">Accepted {acceptedInProperty}</span>
                      <span className="rounded-full bg-red-400/20 px-2.5 py-1 text-red-200">Rejected {rejectedInProperty}</span>
                      <span className="rounded-full bg-slate-400/20 px-2.5 py-1 text-slate-200">Cancelled {cancelledInProperty}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {group.renewals.map((renewal) => {
                    const isPending = renewal.status === "Pending";
                    const isAccepted = renewal.status === "Accepted";
                    const isRejected = renewal.status === "Rejected";
                    const borderColor = isPending
                      ? "border-amber-200"
                      : isAccepted
                      ? "border-emerald-200"
                      : isRejected
                      ? "border-red-200"
                      : "border-gray-100";
                    const bgColor = isPending
                      ? "bg-amber-50"
                      : isAccepted
                      ? "bg-emerald-50"
                      : isRejected
                      ? "bg-red-50"
                      : "bg-gray-50";
                    const badgeColor = isPending
                      ? "bg-amber-100 text-amber-700"
                      : isAccepted
                      ? "bg-emerald-100 text-emerald-700"
                      : isRejected
                      ? "bg-red-100 text-red-700"
                      : "bg-gray-100 text-gray-600";
                    const StatusIcon = isPending ? Clock : isAccepted ? CheckCircle2 : XCircle;

                    return (
                      <div key={renewal._id} className={`rounded-2xl border ${borderColor} ${bgColor} p-5 flex flex-col gap-3`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-bold text-gray-900 text-base truncate">{renewal.tenant?.name}</p>
                            <p className="text-sm text-gray-500 truncate">{renewal.tenant?.email}</p>
                          </div>
                          <span className={`flex-shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${badgeColor}`}>
                            <StatusIcon size={11} />
                            {renewal.status}
                          </span>
                        </div>

                        <div className="rounded-xl border border-gray-200 bg-white p-3 space-y-1.5 text-sm">
                          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Current Lease</p>
                          <div className="flex justify-between text-gray-700">
                            <span>Rent</span>
                            <span className="font-semibold">{formatCurrency(renewal.lease?.rentAmount || 0)}/mo</span>
                          </div>
                          <div className="flex justify-between text-gray-600">
                            <span>Period</span>
                            <span>
                              {renewal.lease?.leaseStartDate ? new Date(renewal.lease.leaseStartDate).toLocaleDateString() : "-"} to {" "}
                              {renewal.lease?.leaseEndDate ? new Date(renewal.lease.leaseEndDate).toLocaleDateString() : "-"}
                            </span>
                          </div>
                        </div>

                        <div className={`rounded-xl border p-3 space-y-1.5 text-sm ${isAccepted ? "border-emerald-200 bg-emerald-50" : "border-blue-100 bg-blue-50"}`}>
                          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Proposed Renewal</p>
                          <div className="flex justify-between text-gray-700">
                            <span>New Rent</span>
                            <span className="font-bold text-emerald-700">{formatCurrency(renewal.proposedRentAmount)}/mo</span>
                          </div>
                          <div className="flex justify-between text-gray-600">
                            <span>Period</span>
                            <span>
                              {new Date(renewal.proposedLeaseStartDate).toLocaleDateString()} to {" "}
                              {new Date(renewal.proposedLeaseEndDate).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        {renewal.note ? (
                          <p className="text-xs text-gray-500 italic border-l-2 border-gray-300 pl-2">
                            "{renewal.note}"
                          </p>
                        ) : null}

                        {isAccepted ? (
                          <div className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs text-emerald-700 font-semibold flex items-center gap-1.5">
                            <CheckCircle2 size={13} /> Tenant accepted - lease will be updated on start date
                          </div>
                        ) : null}

                        {isRejected && renewal.tenantNote ? (
                          <div className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs text-red-700">
                            Tenant note: {renewal.tenantNote}
                          </div>
                        ) : null}

                        {isPending ? (
                          <button
                            type="button"
                            onClick={() => cancelRenewal(renewal._id)}
                            className="mt-auto w-full rounded-xl border border-red-200 bg-white py-2 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
                          >
                            Cancel Proposal
                          </button>
                        ) : null}

                        <p className="text-[10px] text-gray-400">
                          Proposed {new Date(renewal.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LeaseRenewals;
