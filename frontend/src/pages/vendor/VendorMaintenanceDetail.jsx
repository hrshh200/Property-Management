import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, MapPin, User, CalendarDays, Phone, Mail,
  ClipboardList, Camera, CheckCircle2, BadgeIndianRupee,
  AlertTriangle, Clock3, Upload, Loader2, IndianRupee,
  Image as ImageIcon, FileCheck2,
} from "lucide-react";
import api from "../../utils/api";
import toast from "react-hot-toast";

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "");

const toAssetUrl = (p) => {
  if (!p) return "";
  if (p.startsWith("http")) return p;
  return `${API_BASE}${p}`;
};

const QUOTE_COLOR = {
  NotSubmitted: "border-gray-200 bg-gray-50",
  Pending: "border-yellow-200 bg-yellow-50",
  Approved: "border-emerald-200 bg-emerald-50",
  Rejected: "border-red-200 bg-red-50",
};
const QUOTE_TEXT = {
  NotSubmitted: "text-gray-600",
  Pending: "text-yellow-700",
  Approved: "text-emerald-700",
  Rejected: "text-red-700",
};

/* ── Step indicator ─────────────────────── */
const Step = ({ num, label, done, active }) => (
  <div className="flex flex-col items-center gap-1">
    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all ${
      done ? "bg-emerald-500 border-emerald-500 text-white" : active ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-gray-300 text-gray-400"
    }`}>
      {done ? <CheckCircle2 size={16} /> : num}
    </div>
    <p className={`text-[10px] font-semibold uppercase tracking-wide text-center ${done ? "text-emerald-700" : active ? "text-indigo-700" : "text-gray-400"}`}>
      {label}
    </p>
  </div>
);

const StepLine = ({ done }) => (
  <div className={`flex-1 h-0.5 mt-4 rounded-full ${done ? "bg-emerald-400" : "bg-gray-200"}`} />
);

const VendorMaintenanceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");

  // Quote form
  const [quoteAmount, setQuoteAmount] = useState("");
  const [quoteDesc, setQuoteDesc] = useState("");

  // Payment form
  const [payAmount, setPayAmount] = useState("");
  const [payDesc, setPayDesc] = useState("");

  // Photo upload
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  const fetchRequest = async () => {
    try {
      const { data } = await api.get("/vendor/maintenance");
      const req = (data.requests || []).find((r) => r._id === id);
      if (!req) {
        toast.error("Request not found or not assigned to you.");
        navigate("/vendor/maintenance");
        return;
      }
      setRequest(req);
      if (req.vendorQuote?.amount) setQuoteAmount(String(req.vendorQuote.amount));
      if (req.vendorQuote?.description) setQuoteDesc(req.vendorQuote.description);
      if (req.vendorPaymentRequest?.amount) setPayAmount(String(req.vendorPaymentRequest.amount));
      if (req.vendorPaymentRequest?.description) setPayDesc(req.vendorPaymentRequest.description);
    } catch {
      toast.error("Failed to load request.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequest(); }, [id]);

  const handleSubmitQuote = async (e) => {
    e.preventDefault();
    if (!quoteAmount || !quoteDesc) { toast.error("Please enter quote amount and description."); return; }
    setSaving("quote");
    try {
      await api.post(`/vendor/maintenance/${id}/quote`, { amount: quoteAmount, description: quoteDesc });
      toast.success("Quote submitted to owner!");
      await fetchRequest();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit quote.");
    } finally {
      setSaving("");
    }
  };

  const handlePhotoUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingPhotos(true);
    const form = new FormData();
    Array.from(files).forEach((f) => form.append("photos", f));
    try {
      await api.post(`/vendor/maintenance/${id}/work-photos`, form, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Work photos uploaded!");
      await fetchRequest();
    } catch (err) {
      toast.error(err.response?.data?.message || "Photo upload failed.");
    } finally {
      setUploadingPhotos(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleMarkComplete = async () => {
    if (!window.confirm("Mark this job as complete? The owner will be notified.")) return;
    setSaving("complete");
    try {
      await api.patch(`/vendor/maintenance/${id}/complete`);
      toast.success("Job marked as complete!");
      await fetchRequest();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to mark complete.");
    } finally {
      setSaving("");
    }
  };

  const handleRaisePayment = async (e) => {
    e.preventDefault();
    if (!payAmount) { toast.error("Please enter the payment amount."); return; }
    setSaving("payment");
    try {
      await api.post(`/vendor/maintenance/${id}/payment-request`, { amount: payAmount, description: payDesc });
      toast.success("Payment request raised! Owner will be notified.");
      await fetchRequest();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to raise payment request.");
    } finally {
      setSaving("");
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400"><Loader2 className="animate-spin" size={24} /></div>;
  if (!request) return null;

  const quoteApproved = request.quoteStatus === "Approved";
  const quoteRejected = request.quoteStatus === "Rejected";
  const quotePending = request.quoteStatus === "Pending";
  const quoteNotSubmitted = request.quoteStatus === "NotSubmitted";
  const workDone = !!request.workCompletedAt;
  const payRaised = request.vendorPaymentRequest?.status === "Pending";
  const payPaid = request.vendorPaymentRequest?.status === "Paid";

  // Lifecycle step progress
  const step1Done = !quoteNotSubmitted;
  const step2Done = quoteApproved;
  const step3Done = workDone;
  const step4Done = payRaised || payPaid;
  const step5Done = payPaid;

  const currentStep = !step1Done ? 1 : !step2Done ? 2 : !step3Done ? 3 : !step4Done ? 4 : 5;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/vendor/maintenance")}
          className="rounded-xl border border-gray-200 bg-white p-2 hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft size={18} className="text-gray-600" />
        </button>
        <div>
          <h1 className="text-xl font-extrabold text-gray-900">{request.category} Request</h1>
          <p className="text-sm text-gray-500">ID: {request._id}</p>
        </div>
        <div className={`ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border ${
          request.status === "Open" ? "bg-red-50 border-red-200 text-red-700" :
          request.status === "In Progress" ? "bg-amber-50 border-amber-200 text-amber-700" :
          "bg-emerald-50 border-emerald-200 text-emerald-700"
        }`}>
          {request.status === "Open" && <AlertTriangle size={11} />}
          {request.status === "In Progress" && <Clock3 size={11} />}
          {request.status === "Resolved" && <CheckCircle2 size={11} />}
          {request.status}
        </div>
      </div>

      {/* Lifecycle progress */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500 mb-4">Job Lifecycle</p>
        <div className="flex items-start gap-2">
          <Step num={1} label="Submit Quote" done={step1Done} active={currentStep === 1} />
          <StepLine done={step1Done} />
          <Step num={2} label="Quote Approved" done={step2Done} active={currentStep === 2} />
          <StepLine done={step2Done} />
          <Step num={3} label="Work Done" done={step3Done} active={currentStep === 3} />
          <StepLine done={step3Done} />
          <Step num={4} label="Raise Payment" done={step4Done} active={currentStep === 4} />
          <StepLine done={step4Done} />
          <Step num={5} label="Paid" done={step5Done} active={currentStep === 5} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Request details */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Request Details</p>
          <p className="text-sm text-gray-700">{request.description}</p>
          <div className="space-y-1.5 text-xs text-gray-600">
            <p className="inline-flex items-center gap-1.5"><MapPin size={12} /> {request.property?.propertyType}, {request.property?.address?.city}</p>
            <p className="inline-flex items-center gap-1.5"><User size={12} /> Owner: {request.owner?.name}</p>
            <p className="inline-flex items-center gap-1.5"><Phone size={12} /> {request.owner?.phone || "N/A"}</p>
            {request.owner?.email && <p className="inline-flex items-center gap-1.5"><Mail size={12} /> {request.owner.email}</p>}
            <p className="inline-flex items-center gap-1.5"><CalendarDays size={12} /> Filed: {new Date(request.createdAt).toLocaleDateString()}</p>
          </div>

          {/* Tenant photos */}
          {request.photos?.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-2">Tenant's Photos</p>
              <div className="grid grid-cols-3 gap-2">
                {request.photos.map((p, i) => (
                  <a key={i} href={toAssetUrl(p)} target="_blank" rel="noreferrer" className="block rounded-lg overflow-hidden border border-gray-200">
                    <img src={toAssetUrl(p)} alt="" className="h-16 w-full object-cover" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Quote section */}
        <div className={`rounded-2xl border p-5 shadow-sm space-y-3 ${QUOTE_COLOR[request.quoteStatus]}`}>
          <p className={`text-xs font-semibold uppercase tracking-[0.16em] flex items-center gap-1.5 ${QUOTE_TEXT[request.quoteStatus]}`}>
            <ClipboardList size={13} /> Quote / Estimate
          </p>

          {quotePending && (
            <div className="rounded-xl border border-yellow-300 bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
              Quote submitted. Waiting for owner approval.
            </div>
          )}
          {quoteRejected && (
            <div className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
              Your quote was rejected by the owner. You can submit a revised quote.
            </div>
          )}
          {quoteApproved && (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              <strong>Quote approved!</strong> ₹{Number(request.vendorQuote?.amount).toLocaleString("en-IN")}
              <p className="text-xs mt-0.5">{request.vendorQuote?.description}</p>
            </div>
          )}

          {(quoteNotSubmitted || quoteRejected) && (
            <form onSubmit={handleSubmitQuote} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Estimated Amount (₹)</label>
                <div className="relative">
                  <IndianRupee size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="number"
                    min="1"
                    value={quoteAmount}
                    onChange={(e) => setQuoteAmount(e.target.value)}
                    placeholder="e.g. 2500"
                    className="input-field w-full"
                    style={{ paddingLeft: "1.75rem" }}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Scope of Work</label>
                <textarea
                  rows={3}
                  value={quoteDesc}
                  onChange={(e) => setQuoteDesc(e.target.value)}
                  placeholder="Describe what work will be done…"
                  className="input-field w-full resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={saving === "quote"}
                className="btn-primary w-full py-2 text-sm"
              >
                {saving === "quote" ? "Submitting…" : quoteRejected ? "Resubmit Quote" : "Submit Quote"}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Work photos upload (only after quote approved) */}
      <div className={`rounded-2xl border p-5 shadow-sm space-y-3 ${quoteApproved ? "border-indigo-100 bg-white" : "border-gray-100 bg-gray-50 opacity-60"}`}>
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500 flex items-center gap-1.5">
            <Camera size={13} /> Work Done Photos
          </p>
          {!quoteApproved && <span className="text-[11px] text-gray-400">Available after quote approval</span>}
        </div>

        {request.vendorWorkPhotos?.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {request.vendorWorkPhotos.map((p, i) => (
              <a key={i} href={toAssetUrl(p)} target="_blank" rel="noreferrer" className="block rounded-lg overflow-hidden border border-indigo-200">
                <img src={toAssetUrl(p)} alt="" className="h-16 w-full object-cover" />
              </a>
            ))}
          </div>
        )}

        {quoteApproved && (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handlePhotoUpload}
            />
            <button
              type="button"
              disabled={uploadingPhotos}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-60 transition-colors"
            >
              {uploadingPhotos ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
              {uploadingPhotos ? "Uploading…" : "Upload Photos"}
            </button>
          </div>
        )}
      </div>

      {/* Mark work complete */}
      <div className={`rounded-2xl border p-5 shadow-sm space-y-3 ${quoteApproved && !workDone ? "border-teal-100 bg-teal-50/50" : "border-gray-100 bg-gray-50 opacity-60"}`}>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500 flex items-center gap-1.5">
          <FileCheck2 size={13} /> Mark Work as Complete
        </p>
        {workDone ? (
          <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 font-semibold flex items-center gap-2">
            <CheckCircle2 size={16} /> Work completed on {new Date(request.workCompletedAt).toLocaleDateString()}
          </div>
        ) : quoteApproved ? (
          <div>
            <p className="text-sm text-gray-600 mb-3">
              Once the work is fully done, mark it complete. The owner and tenant will be notified.
            </p>
            <button
              type="button"
              disabled={saving === "complete"}
              onClick={handleMarkComplete}
              className="inline-flex items-center gap-2 rounded-xl border border-teal-300 bg-teal-600 text-white px-5 py-2 text-sm font-bold hover:bg-teal-700 disabled:opacity-60 transition-colors"
            >
              {saving === "complete" ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
              {saving === "complete" ? "Marking…" : "Mark Work Complete"}
            </button>
          </div>
        ) : (
          <p className="text-sm text-gray-400">Available after quote approval.</p>
        )}
      </div>

      {/* Raise payment request */}
      <div className={`rounded-2xl border p-5 shadow-sm space-y-3 ${workDone && !payPaid ? "border-amber-100 bg-amber-50/50" : "border-gray-100 bg-gray-50 opacity-60"}`}>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500 flex items-center gap-1.5">
          <BadgeIndianRupee size={13} /> Payment Request
        </p>

        {payPaid ? (
          <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 font-semibold flex items-center gap-2">
            <BadgeIndianRupee size={16} />
            Payment of ₹{Number(request.vendorPaymentRequest.amount).toLocaleString("en-IN")} received!
          </div>
        ) : payRaised ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 font-semibold flex items-center gap-2">
            <Clock3 size={16} />
            Payment request of ₹{Number(request.vendorPaymentRequest.amount).toLocaleString("en-IN")} sent. Waiting for owner.
          </div>
        ) : workDone ? (
          <form onSubmit={handleRaisePayment} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Payment Amount (₹)</label>
              <div className="relative">
                <IndianRupee size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="number"
                  min="1"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder={quoteApproved ? `Agreed: ₹${request.vendorQuote?.amount}` : "Enter amount"}
                  className="input-field w-full"
                  style={{ paddingLeft: "1.75rem" }}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Note (optional)</label>
              <input
                type="text"
                value={payDesc}
                onChange={(e) => setPayDesc(e.target.value)}
                placeholder="e.g. Including materials cost"
                className="input-field w-full"
              />
            </div>
            <button
              type="submit"
              disabled={saving === "payment"}
              className="btn-primary w-full py-2 text-sm"
            >
              {saving === "payment" ? "Raising Request…" : "Raise Payment Request"}
            </button>
          </form>
        ) : (
          <p className="text-sm text-gray-400">Available after marking work as complete.</p>
        )}
      </div>
    </div>
  );
};

export default VendorMaintenanceDetail;
