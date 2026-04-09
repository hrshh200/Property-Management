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
} from "lucide-react";
import { Modal, PageHeader, StatusBadge } from "../../components/UI";
import api from "../../utils/api";
import { formatCurrency } from "../../utils/currency";
import toast from "react-hot-toast";

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
        const [{ data: res }, { data: rentRes }, { data: maintenanceRes }, { data: moveOutRes }, { data: docsRes }] = await Promise.all([
          api.get("/tenant/dashboard"),
          api.get("/tenant/rent-history"),
          api.get("/tenant/maintenance"),
          api.get("/tenant/move-out"),
          api.get("/tenant/compliance-documents"),
        ]);

        setData(res);

        const lease = res?.lease;
        const rents = rentRes?.rents || [];
        const requests = maintenanceRes?.requests || [];
        const moveOutHistory = moveOutRes?.requests || [];
        const docs = docsRes?.documents || [];

        setMoveOutRequests(moveOutHistory);
        setComplianceDocs(docs);

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
      const { data: docsRes } = await api.get("/tenant/compliance-documents");
      setComplianceDocs(docsRes.documents || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to upload document.");
    } finally {
      setUploadingDoc(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Dashboard"
        subtitle="Overview of your tenancy details"
        action={
          <button
            type="button"
            onClick={() => setMoveOutModal(true)}
            disabled={!lease || !!pendingMoveOut}
            className="btn-primary flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <DoorOpen size={16} />
            {pendingMoveOut ? "Move-Out Pending" : "Request Move-Out"}
          </button>
        }
      />

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 px-6 py-7 sm:px-8 shadow-xl">
        <div className="absolute -top-10 -right-8 h-28 w-28 rounded-full bg-blue-400/20 blur-2xl" />
        <div className="absolute -bottom-10 -left-8 h-32 w-32 rounded-full bg-indigo-400/20 blur-2xl" />
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
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Pending Rent</p>
          <p className="mt-2 text-3xl font-extrabold text-amber-700">{formatCurrency(pendingRent)}</p>
          <p className="text-xs text-gray-500 mt-1 inline-flex items-center gap-1"><Wallet size={12} /> Awaiting payment</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Overdue Rent</p>
          <p className="mt-2 text-3xl font-extrabold text-red-700">{formatCurrency(overdueRent)}</p>
          <p className="text-xs text-gray-500 mt-1 inline-flex items-center gap-1"><AlertTriangle size={12} /> Needs immediate action</p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/tenant/maintenance")}
          className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm text-left hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Open Requests</p>
          <p className="mt-2 text-3xl font-extrabold text-blue-700">{openRequests}</p>
          <p className="text-xs text-gray-500 mt-1 inline-flex items-center gap-1"><Wrench size={12} /> Maintenance in progress</p>
        </button>
      </div>

      <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
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
                <div key={alert.id} className="rounded-xl border border-gray-100 p-4">
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

      <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-gray-900 inline-flex items-center gap-2">
            <ClipboardCheck size={18} className="text-indigo-600" /> Move-Out Workflow
          </h3>
          {latestMoveOut ? <StatusBadge status={latestMoveOut.status} /> : null}
        </div>

        {!latestMoveOut ? (
          <p className="text-sm text-gray-600">
            If you plan to vacate the property, submit a move-out request. Your owner can approve with final last staying day and closing formalities.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-xs uppercase tracking-wider font-semibold text-gray-500">Latest Request</p>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-500">Requested Move-Out Date</p>
                  <p className="font-semibold text-gray-900">{new Date(latestMoveOut.requestedMoveOutDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-gray-500">Requested On</p>
                  <p className="font-semibold text-gray-900">{new Date(latestMoveOut.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              {latestMoveOut.reason ? (
                <div className="mt-3">
                  <p className="text-gray-500 text-xs uppercase tracking-wider font-semibold">Reason</p>
                  <p className="text-sm text-gray-700 mt-1">{latestMoveOut.reason}</p>
                </div>
              ) : null}

              {latestMoveOut.status === "Approved" ? (
                <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                  <p className="text-xs uppercase tracking-wider font-semibold text-emerald-700">Owner Approved</p>
                  <p className="mt-1 text-sm text-emerald-800">
                    Last staying day: {latestMoveOut.approvedLastStayingDate ? new Date(latestMoveOut.approvedLastStayingDate).toLocaleDateString() : "Not shared"}
                  </p>
                  <p className="mt-2 text-sm text-emerald-800">
                    Closing formalities: {latestMoveOut.closingFormalities || "Not provided"}
                  </p>
                </div>
              ) : null}

              {latestMoveOut.status === "Rejected" ? (
                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
                  <p className="text-xs uppercase tracking-wider font-semibold text-red-700">Owner Response</p>
                  <p className="mt-1 text-sm text-red-800">{latestMoveOut.ownerNote || "Your owner has rejected this request."}</p>
                </div>
              ) : null}

              {latestMoveOut.status === "Completed" ? (
                <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
                  <p className="text-xs uppercase tracking-wider font-semibold text-blue-700">Move-Out Completed</p>
                  <p className="mt-1 text-sm text-blue-800">
                    Completed on: {latestMoveOut.completedAt ? new Date(latestMoveOut.completedAt).toLocaleDateString() : "Not available"}
                  </p>
                  <p className="mt-2 text-sm text-blue-800">
                    Final note: {latestMoveOut.completionNote || "Move-out process has been closed by owner."}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </section>

      {lease ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Property Info */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
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
              {lease.property?.description && (
                <div className="pt-1">
                  <span className="text-gray-500">Description</span>
                  <p className="text-gray-700 mt-1 bg-gray-50 border border-gray-100 rounded-lg p-2.5">{lease.property.description}</p>
                </div>
              )}

              <div className="pt-4 mt-2 border-t border-gray-100 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-sm font-semibold text-gray-900 inline-flex items-center gap-1.5">
                    <ShieldCheck size={15} className="text-emerald-600" /> Upload Documents
                  </h4>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{complianceDocs.length} uploaded</span>
                </div>

                <form onSubmit={uploadComplianceDoc} className="space-y-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Document Type</label>
                      <select
                        value={docForm.documentType}
                        onChange={(e) => setDocForm({ ...docForm, documentType: e.target.value })}
                        className="input-field"
                      >
                        {DOC_TYPES.map((type) => <option key={type}>{type}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Document Number</label>
                      <input
                        value={docForm.documentNumber}
                        onChange={(e) => setDocForm({ ...docForm, documentNumber: e.target.value })}
                        className="input-field"
                        placeholder="Agreement / Aadhaar no"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Document File</label>
                    <input
                      type="file"
                      accept="application/pdf,image/png,image/jpeg,image/webp"
                      onChange={(e) => setDocForm({ ...docForm, document: e.target.files?.[0] || null })}
                      className="input-field"
                    />
                    <p className="mt-1 text-[11px] text-gray-500">Allowed: PDF, JPG, PNG, WEBP (max 10MB)</p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                    <textarea
                      rows={2}
                      value={docForm.notes}
                      onChange={(e) => setDocForm({ ...docForm, notes: e.target.value })}
                      className="input-field"
                      placeholder="Optional context for owner review"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button type="submit" disabled={uploadingDoc} className="btn-primary inline-flex items-center gap-1.5 text-sm">
                      <Upload size={14} /> {uploadingDoc ? "Uploading..." : "Upload Document"}
                    </button>
                  </div>
                </form>

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
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
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
                <span className="font-medium text-gray-900">{new Date(lease.leaseStartDate).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-gray-500">Lease End</span>
                <span className="font-medium text-gray-900">{new Date(lease.leaseEndDate).toLocaleDateString()}</span>
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
        <div className="rounded-2xl border border-gray-100 bg-white text-center py-16 shadow-sm">
          <Building2 size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 text-lg">No active lease found.</p>
          <p className="text-gray-400 text-sm mt-1">Contact your property owner to be assigned a lease.</p>
        </div>
      )}

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
  );
};

export default TenantDashboard;
