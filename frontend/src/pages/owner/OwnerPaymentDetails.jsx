import React, { useEffect, useState } from "react";
import {
  Landmark,
  Smartphone,
  QrCode,
  Save,
  Pencil,
  Trash2,
  User,
  Building2,
  Hash,
} from "lucide-react";
import { PageHeader } from "../../components/UI";
import api from "../../utils/api";
import toast from "react-hot-toast";

const BANK_OPTIONS = [
  "State Bank of India",
  "HDFC Bank",
  "ICICI Bank",
  "Axis Bank",
  "Punjab National Bank",
  "Bank of Baroda",
  "Kotak Mahindra Bank",
  "Canara Bank",
  "Union Bank of India",
  "IDFC FIRST Bank",
  "IndusInd Bank",
  "Other",
];

const ACCOUNT_TYPE_OPTIONS = ["Savings", "Current"];

const EMPTY_FORM = {
  accountHolderName: "",
  bankName: "",
  accountType: "",
  accountNumber: "",
  ifscCode: "",
  upiId: "",
  qrCodeImageUrl: "",
};

const OwnerPaymentDetails = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingQr, setUploadingQr] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [savedDetails, setSavedDetails] = useState(EMPTY_FORM);
  const [isEditing, setIsEditing] = useState(true);

  const hasAnyInfo = (details = EMPTY_FORM) => Object.values(details).some((v) => (v || "").trim() !== "");

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await api.get("/owner/payment-details");
        if (data.paymentDetails) {
          const fetched = {
            accountHolderName: data.paymentDetails.accountHolderName || "",
            bankName: data.paymentDetails.bankName || "",
            accountType: data.paymentDetails.accountType || "",
            accountNumber: data.paymentDetails.accountNumber || "",
            ifscCode: data.paymentDetails.ifscCode || "",
            upiId: data.paymentDetails.upiId || "",
            qrCodeImageUrl: data.paymentDetails.qrCodeImageUrl || "",
          };
          setSavedDetails(fetched);
          setForm(fetched);
          setIsEditing(!hasAnyInfo(fetched));
        }
      } catch {
        toast.error("Failed to load payment details.");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const uploadQrCode = async (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file for QR code.");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      toast.error("QR image size must be 3MB or less.");
      return;
    }

    setUploadingQr(true);
    try {
      const formData = new FormData();
      formData.append("qrCode", file);
      const { data } = await api.post("/owner/payment-details/qr-upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setForm((prev) => ({ ...prev, qrCodeImageUrl: data.qrCodeImageUrl || prev.qrCodeImageUrl }));
      toast.success("QR code uploaded successfully.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to upload QR code.");
    } finally {
      setUploadingQr(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmed = {
      accountHolderName: form.accountHolderName.trim(),
      bankName: form.bankName.trim(),
      accountType: form.accountType,
      accountNumber: form.accountNumber.trim(),
      ifscCode: form.ifscCode.trim().toUpperCase(),
      upiId: form.upiId.trim(),
      qrCodeImageUrl: form.qrCodeImageUrl.trim(),
    };

    const hasAny = Object.values(trimmed).some((v) => v !== "");
    if (!hasAny) {
      toast.error("Please provide at least one payment method.");
      return;
    }

    const hasAnyBankField = Boolean(
      trimmed.accountHolderName || trimmed.bankName || trimmed.accountType || trimmed.accountNumber || trimmed.ifscCode
    );
    const hasAllBankFields = Boolean(
      trimmed.accountHolderName && trimmed.bankName && trimmed.accountType && trimmed.accountNumber && trimmed.ifscCode
    );
    if (hasAnyBankField && !hasAllBankFields) {
      toast.error("Complete all bank fields or clear them and use UPI/QR only.");
      return;
    }

    if (trimmed.accountNumber && !/^\d{8,20}$/.test(trimmed.accountNumber)) {
      toast.error("Account number must be 8 to 20 digits.");
      return;
    }

    if (trimmed.ifscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(trimmed.ifscCode)) {
      toast.error("Please enter a valid IFSC code.");
      return;
    }

    if (trimmed.upiId && !/^[A-Za-z0-9._-]{2,}@[A-Za-z]{2,}$/.test(trimmed.upiId)) {
      toast.error("Please enter a valid UPI ID.");
      return;
    }

    setSaving(true);
    try {
      await api.put("/owner/payment-details", trimmed);
      setForm(trimmed);
      setSavedDetails(trimmed);
      setIsEditing(false);
      toast.success("Payment details saved successfully.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save payment details.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = () => {
    setForm(savedDetails);
    setIsEditing(true);
  };

  const handleDelete = async () => {
    const confirmed = window.confirm("Delete all saved payment details?");
    if (!confirmed) return;

    setDeleting(true);
    try {
      await api.delete("/owner/payment-details");
      setSavedDetails(EMPTY_FORM);
      setForm(EMPTY_FORM);
      setIsEditing(true);
      toast.success("Payment details deleted.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete payment details.");
    } finally {
      setDeleting(false);
    }
  };

  const hasInfo = hasAnyInfo(savedDetails);

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payment Details"
        subtitle="Store your bank and UPI details so tenants can pay rent easily"
      />

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-900 to-blue-900 px-6 py-7 sm:px-8 shadow-xl">
        <div className="absolute -top-10 -right-8 h-28 w-28 rounded-full bg-indigo-400/20 blur-2xl" />
        <div className="absolute -bottom-10 -left-8 h-32 w-32 rounded-full bg-blue-400/20 blur-2xl" />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-6 text-white">
          <div className="flex-1">
            <p className="text-xs uppercase tracking-[0.16em] text-indigo-200 font-semibold">Owner Payment Hub</p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold">Your bank &amp; UPI details</h2>
            <p className="mt-2 text-sm text-blue-100 max-w-xl">
              Tenants will see these details when making their monthly rent payment. Keep them accurate and up to date.
            </p>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm flex flex-col items-center gap-2 min-w-[130px]">
            <QrCode className="h-10 w-10 text-indigo-200" />
            <p className="text-xs text-indigo-100 font-semibold text-center">
              {hasInfo ? "Details configured" : "Not configured yet"}
            </p>
          </div>
        </div>
      </section>

      {hasInfo && !isEditing && (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-gray-900">Saved Account Details</h3>
            <div className="flex gap-2">
              <button type="button" onClick={handleEdit} className="btn-secondary inline-flex items-center gap-1.5 text-sm">
                <Pencil size={14} /> Edit
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-70"
              >
                <Trash2 size={14} /> {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
            <ul className="space-y-2 text-sm text-gray-700">
              {savedDetails.accountHolderName && <li><span className="font-medium text-gray-900">Account Holder:</span> {savedDetails.accountHolderName}</li>}
              {savedDetails.bankName && <li><span className="font-medium text-gray-900">Bank:</span> {savedDetails.bankName}</li>}
              {savedDetails.accountType && <li><span className="font-medium text-gray-900">Account Type:</span> {savedDetails.accountType}</li>}
              {savedDetails.accountNumber && <li><span className="font-medium text-gray-900">Account Number:</span> {savedDetails.accountNumber}</li>}
              {savedDetails.ifscCode && <li><span className="font-medium text-gray-900">IFSC:</span> {savedDetails.ifscCode}</li>}
              {savedDetails.upiId && <li><span className="font-medium text-gray-900">UPI ID:</span> {savedDetails.upiId}</li>}
            </ul>
            {savedDetails.qrCodeImageUrl && (
              <div className="mt-3 flex flex-col items-start gap-1">
                <p className="text-xs font-medium text-gray-500">QR Code</p>
                <img
                  src={savedDetails.qrCodeImageUrl}
                  alt="Saved payment QR"
                  className="h-36 w-36 rounded-lg border border-indigo-100 object-contain bg-white"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {isEditing && (
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Bank Account Section */}
          <div>
            <p className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Landmark size={15} className="text-indigo-500" /> Bank Account Details
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Account Holder Name</label>
                <div className="relative">
                  <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10" />
                  <input
                    type="text"
                    value={form.accountHolderName}
                    onChange={(e) => setForm({ ...form, accountHolderName: e.target.value })}
                    className="input-field !pl-11"
                    placeholder="e.g. Rajesh Kumar"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Bank Name</label>
                <div className="relative">
                  <Building2 size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10" />
                  <select
                    value={form.bankName}
                    onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                    className="input-field !pl-11 !pr-10"
                  >
                    <option value="">Select bank</option>
                    {BANK_OPTIONS.map((bank) => (
                      <option key={bank} value={bank}>
                        {bank}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Account Type</label>
                <select
                  value={form.accountType}
                  onChange={(e) => setForm({ ...form, accountType: e.target.value })}
                  className="input-field"
                >
                  <option value="">Select account type</option>
                  {ACCOUNT_TYPE_OPTIONS.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Account Number</label>
                <div className="relative">
                  <Hash size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10" />
                  <input
                    type="text"
                    value={form.accountNumber}
                    onChange={(e) => setForm({ ...form, accountNumber: e.target.value.replace(/\D/g, "") })}
                    className="input-field !pl-11"
                    placeholder="e.g. 3876524100001"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">IFSC Code</label>
                <input
                  type="text"
                  value={form.ifscCode}
                  onChange={(e) => setForm({ ...form, ifscCode: e.target.value.toUpperCase() })}
                  className="input-field"
                  placeholder="e.g. SBIN0001234"
                />
              </div>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* UPI Section */}
          <div>
            <p className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Smartphone size={15} className="text-indigo-500" /> UPI &amp; QR Code
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">UPI ID</label>
                <div className="relative">
                  <Smartphone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10" />
                  <input
                    type="text"
                    value={form.upiId}
                    onChange={(e) => setForm({ ...form, upiId: e.target.value })}
                    className="input-field !pl-11"
                    placeholder="e.g. rajesh@upi"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Upload QR Code</label>
                <div className="rounded-xl border border-gray-200 p-3 bg-white">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => uploadQrCode(e.target.files?.[0])}
                    className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100"
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    PNG, JPG, WEBP up to 3MB. Upload starts immediately.
                  </p>
                  {uploadingQr && (
                    <p className="mt-1 text-xs font-medium text-indigo-600">Uploading QR code...</p>
                  )}
                </div>
              </div>
            </div>

            {form.qrCodeImageUrl && (
              <div className="mt-4 flex flex-col items-start gap-2">
                <p className="text-xs font-medium text-gray-500">QR Code Preview</p>
                <img
                  src={form.qrCodeImageUrl}
                  alt="QR Code Preview"
                  className="h-44 w-44 rounded-xl border border-indigo-100 object-contain bg-gray-50 shadow-sm"
                  onError={(e) => { e.target.style.display = "none"; }}
                />
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2">
            {hasInfo && (
              <button
                type="button"
                onClick={() => {
                  setForm(savedDetails);
                  setIsEditing(false);
                }}
                className="btn-secondary mr-2"
              >
                Cancel
              </button>
            )}
            <button type="submit" disabled={saving} className="btn-primary inline-flex items-center gap-2">
              <Save size={15} />
              {saving ? "Saving..." : "Save Payment Details"}
            </button>
          </div>
        </form>
      </div>
      )}

    </div>
  );
};

export default OwnerPaymentDetails;
