import React, { useEffect, useState } from "react";
import { DoorOpen, ClipboardCheck, CheckCircle2, XCircle } from "lucide-react";
import { PageHeader, Modal, EmptyState, StatusBadge } from "../../components/UI";
import api from "../../utils/api";
import { formatCurrency } from "../../utils/currency";
import toast from "react-hot-toast";

const MoveOutRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [decisionModal, setDecisionModal] = useState(false);
  const [completionModal, setCompletionModal] = useState(false);
  const [activeRequest, setActiveRequest] = useState(null);
  const [completionRequest, setCompletionRequest] = useState(null);
  const [decisionForm, setDecisionForm] = useState({
    status: "Approved",
    approvedLastStayingDate: "",
    closingFormalities: "",
    ownerNote: "",
  });
  const [completionForm, setCompletionForm] = useState({
    completionNote: "Tenant handed over keys, property inspected, and move-out formalities completed.",
    unpaidRentAmount: "0",
    maintenanceDeduction: "0",
    otherDeduction: "0",
    settlementNote: "",
  });

  const fetchRequests = async () => {
    try {
      const { data } = await api.get("/owner/move-out");
      setRequests(data.requests || []);
    } catch {
      toast.error("Failed to load move-out requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const openDecisionModal = (request) => {
    setActiveRequest(request);
    setDecisionForm({
      status: "Approved",
      approvedLastStayingDate: request.requestedMoveOutDate?.slice(0, 10) || "",
      closingFormalities: "Collect keys, verify pending dues, inspect damages, and process security deposit settlement.",
      ownerNote: "",
    });
    setDecisionModal(true);
  };

  const submitDecision = async (e) => {
    e.preventDefault();
    if (!activeRequest?._id) return;
    setSaving(true);
    try {
      await api.patch(`/owner/move-out/${activeRequest._id}/decision`, decisionForm);
      toast.success("Move-out request updated.");
      setDecisionModal(false);
      setActiveRequest(null);
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update move-out request.");
    } finally {
      setSaving(false);
    }
  };

  const openCompletionModal = (request) => {
    setCompletionRequest(request);
    setCompletionForm({
      completionNote: "Tenant handed over keys, property inspected, and move-out formalities completed.",
      unpaidRentAmount: String(request.outstandingDueAmount || 0),
      maintenanceDeduction: "0",
      otherDeduction: "0",
      settlementNote: "",
    });
    setCompletionModal(true);
  };

  const completeMoveOut = async (e) => {
    e.preventDefault();
    if (!completionRequest?._id) {
      toast.error("Invalid move-out request.");
      return;
    }

    try {
      setSaving(true);
      await api.patch(`/owner/move-out/${completionRequest._id}/complete`, {
        completionNote: completionForm.completionNote,
        unpaidRentAmount: completionForm.unpaidRentAmount,
        maintenanceDeduction: completionForm.maintenanceDeduction,
        otherDeduction: completionForm.otherDeduction,
        settlementNote: completionForm.settlementNote,
      });
      toast.success("Move-out completed. Lease closed and property marked vacant.");
      setCompletionModal(false);
      setCompletionRequest(null);
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to complete move-out.");
    } finally {
      setSaving(false);
    }
  };

  const pendingCount = requests.filter((r) => r.status === "Pending").length;
  const approvedCount = requests.filter((r) => r.status === "Approved").length;
  const completedCount = requests.filter((r) => r.status === "Completed").length;

  const groupedByProperty = requests.reduce((acc, request) => {
    const propertyId = request.property?._id || "unknown-property";
    if (!acc[propertyId]) {
      acc[propertyId] = {
        property: request.property,
        requests: [],
      };
    }
    acc[propertyId].requests.push(request);
    return acc;
  }, {});

  const propertyGroups = Object.values(groupedByProperty).sort((a, b) => {
    const aPending = a.requests.filter((r) => r.status === "Pending").length;
    const bPending = b.requests.filter((r) => r.status === "Pending").length;
    if (bPending !== aPending) return bPending - aPending;
    const aName = `${a.property?.propertyType || "Property"} ${a.property?.address?.city || ""}`.trim();
    const bName = `${b.property?.propertyType || "Property"} ${b.property?.address?.city || ""}`.trim();
    return aName.localeCompare(bName);
  });

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Move-Out Requests"
        subtitle="Review move-out requests grouped by property"
      />

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-900 via-red-900 to-orange-800 px-6 py-7 sm:px-8 shadow-xl">
        <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-rose-400/20 blur-2xl" />
        <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-orange-400/20 blur-2xl" />
        <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-4 text-white">
          <div className="col-span-2 sm:col-span-1">
            <p className="text-xs uppercase tracking-widest text-rose-200 font-semibold">Total</p>
            <p className="mt-2 text-4xl font-extrabold">{requests.length}</p>
            <p className="mt-1 text-xs text-rose-100">All move-out requests</p>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
            <p className="text-xs uppercase tracking-wider text-amber-200 font-semibold">Pending</p>
            <p className="mt-1 text-3xl font-extrabold text-amber-300">{pendingCount}</p>
            <p className="text-xs text-rose-100 mt-1">Waiting for decision</p>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
            <p className="text-xs uppercase tracking-wider text-blue-200 font-semibold">Approved</p>
            <p className="mt-1 text-3xl font-extrabold text-blue-200">{approvedCount}</p>
            <p className="text-xs text-rose-100 mt-1">Ready for completion</p>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
            <p className="text-xs uppercase tracking-wider text-emerald-200 font-semibold">Completed</p>
            <p className="mt-1 text-3xl font-extrabold text-emerald-300">{completedCount}</p>
            <p className="text-xs text-rose-100 mt-1">Finalized exits</p>
          </div>
        </div>
      </section>

      {requests.length === 0 ? (
        <EmptyState message="No move-out requests submitted yet." icon={DoorOpen} />
      ) : (
        <div className="space-y-5">
          {propertyGroups.map((group, index) => {
            const pendingInProperty = group.requests.filter((r) => r.status === "Pending").length;
            const approvedInProperty = group.requests.filter((r) => r.status === "Approved").length;
            const completedInProperty = group.requests.filter((r) => r.status === "Completed").length;

            return (
              <section key={group.property?._id || `moveout-group-${index}`} className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-slate-900 to-slate-700 px-5 py-4 text-white">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.15em] text-slate-300 font-semibold">Property</p>
                      <h3 className="mt-1 text-lg font-bold">{group.property?.propertyType || "Property"}</h3>
                      <p className="text-sm text-slate-200">
                        {group.property?.address?.street || "Address not available"}
                        {group.property?.address?.city ? `, ${group.property.address.city}` : ""}
                        {group.property?.address?.state ? `, ${group.property.address.state}` : ""}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide">
                      <span className="rounded-full bg-amber-400/20 px-2.5 py-1 text-amber-200">Pending {pendingInProperty}</span>
                      <span className="rounded-full bg-blue-400/20 px-2.5 py-1 text-blue-200">Approved {approvedInProperty}</span>
                      <span className="rounded-full bg-emerald-400/20 px-2.5 py-1 text-emerald-200">Completed {completedInProperty}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  {group.requests.map((request) => (
                    <div key={request._id} className="rounded-xl border border-gray-100 p-4">
                      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-gray-900 inline-flex items-center gap-1.5">
                              <ClipboardCheck size={15} className="text-indigo-600" /> {request.tenant?.name}
                            </p>
                            <StatusBadge status={request.status} />
                          </div>
                          <p className="text-sm text-gray-600">{request.tenant?.email || "No email"}</p>
                          <p className="text-xs text-gray-500">
                            Requested move-out: {request.requestedMoveOutDate ? new Date(request.requestedMoveOutDate).toLocaleDateString() : "-"}
                          </p>
                          {request.reason ? <p className="text-sm text-gray-700">Reason: {request.reason}</p> : null}

                          {request.status === "Approved" ? (
                            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                              <p>Last staying day: {request.approvedLastStayingDate ? new Date(request.approvedLastStayingDate).toLocaleDateString() : "Not provided"}</p>
                              <p className="mt-1">Closing formalities: {request.closingFormalities || "Not provided"}</p>
                              {(request.outstandingDueCount || 0) > 0 ? (
                                <p className="mt-2 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700">
                                  Completion blocked: {request.outstandingDueCount} pending/overdue rent record(s) worth {formatCurrency(request.outstandingDueAmount || 0)} must be cleared first.
                                </p>
                              ) : null}
                            </div>
                          ) : null}

                          {request.status === "Rejected" ? (
                            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                              Reason shared: {request.ownerNote || "Not provided"}
                            </div>
                          ) : null}

                          {request.status === "Completed" ? (
                            <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                              <p>Completed on: {request.completedAt ? new Date(request.completedAt).toLocaleDateString() : "Not available"}</p>
                              <p className="mt-1">Completion note: {request.completionNote || "Not provided"}</p>
                            </div>
                          ) : null}
                        </div>

                        <div className="flex gap-2">
                          {request.status === "Pending" ? (
                            <button
                              type="button"
                              onClick={() => openDecisionModal(request)}
                              className="btn-primary py-1.5 px-3 text-sm"
                            >
                              Review Request
                            </button>
                          ) : null}

                          {request.status === "Approved" ? (
                            <button
                              type="button"
                              onClick={() => openCompletionModal(request)}
                              disabled={request.canComplete === false}
                              className="btn-secondary py-1.5 px-3 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                              title={request.canComplete === false ? "Clear all pending/overdue rent before completing move-out" : "Mark move-out completed"}
                            >
                              Mark Completed
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <Modal isOpen={decisionModal} onClose={() => setDecisionModal(false)} title="Review Move-Out Request">
        <form onSubmit={submitDecision} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Decision</label>
            <select
              value={decisionForm.status}
              onChange={(e) => setDecisionForm({ ...decisionForm, status: e.target.value })}
              className="input-field"
            >
              <option value="Approved">Approve</option>
              <option value="Rejected">Reject</option>
            </select>
          </div>

          {decisionForm.status === "Approved" ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Staying Day</label>
                <input
                  type="date"
                  required
                  value={decisionForm.approvedLastStayingDate}
                  onChange={(e) => setDecisionForm({ ...decisionForm, approvedLastStayingDate: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Closing Formalities</label>
                <textarea
                  rows={4}
                  required
                  value={decisionForm.closingFormalities}
                  onChange={(e) => setDecisionForm({ ...decisionForm, closingFormalities: e.target.value })}
                  className="input-field"
                  placeholder="Mention key handover, utility clearance, final inspection, dues settlement, etc."
                />
              </div>
            </>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Rejection</label>
              <textarea
                rows={3}
                required
                value={decisionForm.ownerNote}
                onChange={(e) => setDecisionForm({ ...decisionForm, ownerNote: e.target.value })}
                className="input-field"
                placeholder="Explain why request is rejected and what tenant should do next"
              />
            </div>
          )}

          <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
            Approved requests will be visible to tenant with last staying day and closing formalities.
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setDecisionModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary inline-flex items-center gap-1.5">
              {decisionForm.status === "Approved" ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
              {saving ? "Saving..." : "Submit Decision"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={completionModal} onClose={() => setCompletionModal(false)} title="Complete Move-Out">
        <form onSubmit={completeMoveOut} className="space-y-4">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Final Confirmation</p>
            <p className="mt-1 text-sm text-emerald-800">
              This will close the active lease and mark this property as Vacant.
            </p>
            {completionRequest ? (
              <p className="mt-2 text-xs text-emerald-700">
                Tenant: {completionRequest.tenant?.name || "-"} | Property: {completionRequest.property?.propertyType || "-"}, {completionRequest.property?.address?.city || "-"}
              </p>
            ) : null}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Completion Note</label>
            <textarea
              rows={4}
              value={completionForm.completionNote}
              onChange={(e) => setCompletionForm({ ...completionForm, completionNote: e.target.value })}
              className="input-field"
              placeholder="Mention handover status, inspection, dues/deposit settlement, etc."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unpaid Rent</label>
              <input type="number" min={0} step="0.01" value={completionForm.unpaidRentAmount} onChange={(e) => setCompletionForm({ ...completionForm, unpaidRentAmount: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Maintenance Deduction</label>
              <input type="number" min={0} step="0.01" value={completionForm.maintenanceDeduction} onChange={(e) => setCompletionForm({ ...completionForm, maintenanceDeduction: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Other Deduction</label>
              <input type="number" min={0} step="0.01" value={completionForm.otherDeduction} onChange={(e) => setCompletionForm({ ...completionForm, otherDeduction: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Settlement Note</label>
              <input value={completionForm.settlementNote} onChange={(e) => setCompletionForm({ ...completionForm, settlementNote: e.target.value })} className="input-field" placeholder="Optional note" />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setCompletionModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Completing..." : "Confirm Completion"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default MoveOutRequests;
