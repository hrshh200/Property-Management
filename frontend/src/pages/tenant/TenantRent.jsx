import React, { useEffect, useState } from "react";
import {
  DollarSign,
  Search,
  CalendarDays,
  MapPin,
  ReceiptText,
  Download,
  QrCode,
  Landmark,
  Smartphone,
  Send,
} from "lucide-react";
import { PageHeader, StatusBadge, EmptyState, Modal } from "../../components/UI";
import api from "../../utils/api";
import { formatCurrency } from "../../utils/currency";
import toast from "react-hot-toast";

const TenantRent = () => {
  const [rents, setRents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [payModal, setPayModal] = useState(false);
  const [selectedRent, setSelectedRent] = useState(null);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [ownerPaymentDetails, setOwnerPaymentDetails] = useState(null);
  const [paymentDetailView, setPaymentDetailView] = useState("account");
  const [paymentForm, setPaymentForm] = useState({
    transactionId: "",
    paidDate: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  const fetchRents = async () => {
    try {
      const { data } = await api.get("/tenant/rent-history");
      setRents(data.rents);
    } catch {
      toast.error("Failed to load rent history.");
    } finally {
      setLoading(false);
    }
  };

  const fetchOwnerPaymentDetails = async () => {
    try {
      const { data } = await api.get("/tenant/owner-payment-details");
      setOwnerPaymentDetails(data.paymentDetails || null);
    } catch {
      setOwnerPaymentDetails(null);
    }
  };

  useEffect(() => {
    fetchRents();
    fetchOwnerPaymentDetails();
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
    const haystack = [r.month, String(r.year), r.property?.propertyType, r.property?.address?.city, r.status]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(normalizedSearch);
  });

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

  const openPayModal = (rent) => {
    const hasQr = Boolean(ownerPaymentDetails?.qrCodeImageUrl);
    const hasAccount = Boolean(
      ownerPaymentDetails?.accountHolderName ||
      ownerPaymentDetails?.bankName ||
      ownerPaymentDetails?.accountType ||
      ownerPaymentDetails?.accountNumber ||
      ownerPaymentDetails?.ifscCode ||
      ownerPaymentDetails?.upiId
    );

    setSelectedRent(rent);
    setPaymentDetailView(hasAccount ? "account" : hasQr ? "qr" : "account");
    setPaymentForm({
      transactionId: rent.paymentSubmission?.transactionId || "",
      paidDate: rent.paymentSubmission?.paidAt
        ? new Date(rent.paymentSubmission.paidAt).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10),
      notes: rent.paymentSubmission?.notes || "",
    });
    setPayModal(true);
  };

  const submitPayment = async (e) => {
    e.preventDefault();
    if (!selectedRent?._id) return;
    setSubmittingPayment(true);
    try {
      await api.post(`/tenant/rent/${selectedRent._id}/submit-payment`, paymentForm);
      toast.success("Payment details submitted. Owner will verify shortly.");
      setPayModal(false);
      setSelectedRent(null);
      fetchRents();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit payment details.");
    } finally {
      setSubmittingPayment(false);
    }
  };

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
            <table className="w-full text-sm min-w-[920px]">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr className="text-left">
                  <th className="px-4 py-3 font-medium text-gray-600">Month / Year</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Property</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Amount</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Due Date</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Paid Date</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Actions</th>
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
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1.5">
                        {r.status !== "Paid" && (
                          <button
                            type="button"
                            onClick={() => openPayModal(r)}
                            className="inline-flex w-fit items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100"
                          >
                            <QrCode size={12} /> View Payment Details
                          </button>
                        )}

                        {r.paymentSubmission?.status === "Submitted" && (
                          <span className="inline-flex w-fit items-center rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700">
                            Submitted: {r.paymentSubmission?.transactionId || "-"}
                          </span>
                        )}

                        {r.status === "Paid" ? (
                          <button
                            type="button"
                            onClick={() => downloadReceipt(r._id)}
                            className="inline-flex w-fit items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-100"
                          >
                            <Download size={12} /> Receipt
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">Receipt after owner confirmation</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        isOpen={payModal}
        onClose={() => setPayModal(false)}
        title={`Pay ${selectedRent?.month || ""} ${selectedRent?.year || ""} Rent`}
      >
        <div className="space-y-4">
          {ownerPaymentDetails && Object.values(ownerPaymentDetails).some((v) => v) ? (
            <div className="rounded-2xl border border-indigo-100 bg-white shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-4 py-3 text-white">
                <p className="text-sm font-semibold">Owner Payment Details</p>
                <p className="text-xs text-indigo-100">Choose one method and complete your transfer</p>
              </div>

              <div className="p-4 space-y-4">
                <div className="inline-flex rounded-xl border border-indigo-100 bg-indigo-50 p-1">
                  <button
                    type="button"
                    onClick={() => setPaymentDetailView("account")}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                      paymentDetailView === "account"
                        ? "bg-white text-indigo-700 shadow-sm"
                        : "text-indigo-600 hover:text-indigo-700"
                    }`}
                  >
                    <Landmark size={13} /> Account Details
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentDetailView("qr")}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                      paymentDetailView === "qr"
                        ? "bg-white text-indigo-700 shadow-sm"
                        : "text-indigo-600 hover:text-indigo-700"
                    }`}
                  >
                    <QrCode size={13} /> QR Code
                  </button>
                </div>

                {paymentDetailView === "account" ? (
                  <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 text-sm">
                    <div className="grid grid-cols-1 sm:grid-cols-[150px_1fr] gap-x-3 gap-y-2">
                      {ownerPaymentDetails.accountHolderName && (
                        <>
                          <p className="text-xs font-semibold tracking-wide text-indigo-700 uppercase">A/C Holder</p>
                          <p className="text-gray-800 font-medium break-words">{ownerPaymentDetails.accountHolderName}</p>
                        </>
                      )}
                      {ownerPaymentDetails.bankName && (
                        <>
                          <p className="text-xs font-semibold tracking-wide text-indigo-700 uppercase">Bank Name</p>
                          <p className="text-gray-800 break-words">{ownerPaymentDetails.bankName}</p>
                        </>
                      )}
                      {ownerPaymentDetails.accountType && (
                        <>
                          <p className="text-xs font-semibold tracking-wide text-indigo-700 uppercase">Account Type</p>
                          <p>
                            <span className="inline-flex rounded-md border border-indigo-200 bg-white px-2 py-0.5 text-xs font-semibold text-indigo-700">
                              {ownerPaymentDetails.accountType}
                            </span>
                          </p>
                        </>
                      )}
                      {ownerPaymentDetails.accountNumber && (
                        <>
                          <p className="text-xs font-semibold tracking-wide text-indigo-700 uppercase">Account Number</p>
                          <p className="font-mono text-gray-900 tracking-wide break-all">{ownerPaymentDetails.accountNumber}</p>
                        </>
                      )}
                      {ownerPaymentDetails.ifscCode && (
                        <>
                          <p className="text-xs font-semibold tracking-wide text-indigo-700 uppercase">IFSC</p>
                          <p className="font-mono text-gray-900 tracking-wider">{ownerPaymentDetails.ifscCode}</p>
                        </>
                      )}
                      {ownerPaymentDetails.upiId && (
                        <>
                          <p className="text-xs font-semibold tracking-wide text-indigo-700 uppercase">UPI ID</p>
                          <p className="inline-flex items-start gap-1.5 text-gray-800 break-all">
                            <Smartphone size={13} className="text-indigo-500 mt-0.5 shrink-0" />
                            <span className="font-mono">{ownerPaymentDetails.upiId}</span>
                          </p>
                        </>
                      )}
                    </div>

                    {!ownerPaymentDetails.accountHolderName &&
                      !ownerPaymentDetails.bankName &&
                      !ownerPaymentDetails.accountType &&
                      !ownerPaymentDetails.accountNumber &&
                      !ownerPaymentDetails.ifscCode &&
                      !ownerPaymentDetails.upiId && (
                        <p className="text-xs text-gray-500">Account details are not available. Use QR Code tab to pay.</p>
                      )}
                  </div>
                ) : (
                  <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 text-sm">
                    {ownerPaymentDetails.qrCodeImageUrl ? (
                      <div className="flex flex-col items-center gap-3">
                        <p className="text-xs font-semibold text-gray-600">Scan QR to Pay</p>
                        <img
                          src={ownerPaymentDetails.qrCodeImageUrl}
                          alt="Payment QR"
                          className="h-52 w-52 rounded-xl border border-indigo-100 object-contain bg-white p-2 shadow-sm"
                        />
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500">QR code is not available. Use Account Details tab to pay.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-700">
              Your owner has not yet set up payment details. Please contact your owner directly.
            </div>
          )}

          <form onSubmit={submitPayment} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Transaction ID <span className="text-red-500">*</span></label>
              <input
                required
                type="text"
                value={paymentForm.transactionId}
                onChange={(e) => setPaymentForm({ ...paymentForm, transactionId: e.target.value })}
                className="input-field"
                placeholder="Enter UPI/Bank transaction reference"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date</label>
              <input
                required
                type="date"
                value={paymentForm.paidDate}
                onChange={(e) => setPaymentForm({ ...paymentForm, paidDate: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
              <input
                type="text"
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                className="input-field"
                placeholder="Any extra details"
              />
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <button type="button" onClick={() => setPayModal(false)} className="btn-secondary">Close</button>
              <button type="submit" disabled={submittingPayment} className="btn-primary inline-flex items-center gap-2">
                <Send size={14} /> {submittingPayment ? "Submitting..." : "Submit Payment Details"}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
};

export default TenantRent;
