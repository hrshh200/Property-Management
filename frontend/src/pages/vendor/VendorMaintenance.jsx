import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Wrench, AlertTriangle, Clock3, CheckCircle2, LayoutGrid,
  MapPin, User, CalendarDays, BadgeIndianRupee, ClipboardList,
} from "lucide-react";
import api from "../../utils/api";
import toast from "react-hot-toast";
import { PageHeader, EmptyState, StatusBadge } from "../../components/UI";

const URGENCY_PILL = {
  Low: "bg-gray-100 text-gray-700 border-gray-200",
  Medium: "bg-blue-100 text-blue-700 border-blue-200",
  High: "bg-amber-100 text-amber-700 border-amber-200",
  Emergency: "bg-red-100 text-red-700 border-red-200",
};

const QUOTE_PILL = {
  NotSubmitted: "bg-gray-100 text-gray-600 border-gray-200",
  Pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
  Approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Rejected: "bg-red-100 text-red-700 border-red-200",
};

const PAY_PILL = {
  NotRaised: "bg-gray-100 text-gray-500 border-gray-200",
  Pending: "bg-amber-100 text-amber-700 border-amber-200",
  Paid: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

const STATUS_FILTERS = ["All", "Open", "In Progress", "Resolved"];

const VendorMaintenance = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("All");

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/vendor/maintenance");
        setRequests(data.requests || []);
      } catch {
        toast.error("Failed to load maintenance requests.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = filterStatus === "All" ? requests : requests.filter((r) => r.status === filterStatus);
  const openCount = requests.filter((r) => r.status === "Open").length;
  const inProgressCount = requests.filter((r) => r.status === "In Progress").length;
  const resolvedCount = requests.filter((r) => r.status === "Resolved").length;

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading…</div>;

  return (
    <div className="space-y-6">
      <PageHeader title="My Assigned Jobs" subtitle="All maintenance requests assigned to you" />

      {/* Stats tiles */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: "All", value: requests.length, icon: LayoutGrid, color: "indigo" },
          { label: "Open", value: openCount, icon: AlertTriangle, color: "red" },
          { label: "In Progress", value: inProgressCount, icon: Clock3, color: "amber" },
          { label: "Resolved", value: resolvedCount, icon: CheckCircle2, color: "emerald" },
        ].map(({ label, value, icon: Icon, color }) => (
          <button
            key={label}
            type="button"
            onClick={() => setFilterStatus(label)}
            className={`rounded-2xl border p-5 shadow-sm text-left transition-all ${
              filterStatus === label
                ? `border-${color}-300 bg-${color}-50/60 ring-2 ring-${color}-200`
                : "border-gray-100 bg-white hover:shadow-md"
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</p>
                <p className={`mt-2 text-3xl font-extrabold text-${color}-700`}>{value}</p>
              </div>
              <Icon size={16} className={`text-${color}-500 mt-1`} />
            </div>
          </button>
        ))}
      </div>

      {/* Request list */}
      {filtered.length === 0 ? (
        <EmptyState message="No requests match this filter." icon={Wrench} />
      ) : (
        <div className="space-y-4">
          {filtered.map((r) => (
            <div key={r._id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-gray-900 text-base inline-flex items-center gap-1.5">
                      {r.status === "Open" && <AlertTriangle size={14} className="text-red-600" />}
                      {r.status === "In Progress" && <Clock3 size={14} className="text-amber-600" />}
                      {r.status === "Resolved" && <CheckCircle2 size={14} className="text-green-600" />}
                      {r.category}
                    </span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${URGENCY_PILL[r.urgency] || URGENCY_PILL.Medium}`}>
                      {r.urgency}
                    </span>
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="text-sm text-gray-600">{r.description}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 pt-1">
                    <span className="inline-flex items-center gap-1"><MapPin size={12} /> {r.property?.address?.city || "N/A"}</span>
                    <span className="inline-flex items-center gap-1"><User size={12} /> {r.owner?.name || "Owner"}</span>
                    <span className="inline-flex items-center gap-1"><CalendarDays size={12} /> {new Date(r.createdAt).toLocaleDateString()}</span>
                  </div>

                  {/* Lifecycle badges */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${QUOTE_PILL[r.quoteStatus]}`}>
                      <ClipboardList size={10} /> Quote: {r.quoteStatus}
                    </span>
                    {r.workCompletedAt && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-emerald-100 text-emerald-700 border-emerald-200">
                        <CheckCircle2 size={10} /> Work Done
                      </span>
                    )}
                    {r.vendorPaymentRequest?.status && r.vendorPaymentRequest.status !== "NotRaised" && (
                      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${PAY_PILL[r.vendorPaymentRequest.status]}`}>
                        <BadgeIndianRupee size={10} /> Pay: {r.vendorPaymentRequest.status}
                      </span>
                    )}
                  </div>
                </div>

                <Link
                  to={`/vendor/maintenance/${r._id}`}
                  className="btn-secondary text-sm py-1.5 px-4 whitespace-nowrap h-fit"
                >
                  Open Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VendorMaintenance;
