import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  Wrench, ClipboardList, Clock3, CheckCircle2, BadgeIndianRupee,
  AlertCircle, ArrowRight, Hammer, Zap, Droplets, Paintbrush, BriefcaseBusiness,
  Save, RefreshCw, ShieldCheck, UserCircle2, Lock,
} from "lucide-react";
import api from "../../utils/api";
import toast from "react-hot-toast";
import { PageHeader, EmptyState } from "../../components/UI";
import { setCredentials } from "../../app/slices/authSlice";

const SPEC_ICON = { Electric: Zap, Plumbing: Droplets, General: Hammer, Carpentry: Hammer, Painting: Paintbrush, Other: BriefcaseBusiness };
const SPEC_OPTIONS = ["Electric", "Plumbing", "General", "Carpentry", "Painting", "Other"];

const quoteStatusPill = (s) => {
  const m = {
    NotSubmitted: "bg-gray-100 text-gray-600 border-gray-200",
    Pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
    Approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
    Rejected: "bg-red-100 text-red-700 border-red-200",
  };
  return m[s] || m.NotSubmitted;
};

const payStatusPill = (s) => {
  const m = {
    NotRaised: "bg-gray-100 text-gray-600 border-gray-200",
    Pending: "bg-amber-100 text-amber-700 border-amber-200",
    Paid: "bg-emerald-100 text-emerald-700 border-emerald-200",
  };
  return m[s] || m.NotRaised;
};

const VendorDashboard = () => {
  const dispatch = useDispatch();
  const { user, token } = useSelector((state) => state.auth);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [profileForm, setProfileForm] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    countryCode: "+91",
    phone: "",
    vendorName: "",
    city: "",
    notes: "",
    specializations: ["General"],
  });
  const [passwordForm, setPasswordForm] = useState({ password: "", confirmPassword: "" });

  const hydrateProfileForm = (vendorProfile, userProfile) => {
    const currentCountryCode = userProfile?.countryCode || "+91";
    const rawPhone = (userProfile?.phone || vendorProfile?.phone || "").toString();
    const trimmedPhone = rawPhone.startsWith(currentCountryCode)
      ? rawPhone.slice(currentCountryCode.length)
      : rawPhone.replace(/\D/g, "");

    setProfileForm({
      firstName: userProfile?.firstName || "",
      middleName: userProfile?.middleName || "",
      lastName: userProfile?.lastName || "",
      email: userProfile?.email || vendorProfile?.email || "",
      countryCode: currentCountryCode,
      phone: trimmedPhone,
      vendorName: vendorProfile?.name || "",
      city: vendorProfile?.city || "",
      notes: vendorProfile?.notes || "",
      specializations: vendorProfile?.specializations?.length ? vendorProfile.specializations : ["General"],
    });
  };

  useEffect(() => {
    (async () => {
      try {
        const [profileRes, maintRes] = await Promise.all([
          api.get("/vendor/profile"),
          api.get("/vendor/maintenance"),
        ]);
        const vendorProfile = profileRes.data.vendor || {};
        const userProfile = profileRes.data.user || {};
        setData({ vendor: vendorProfile, user: userProfile, requests: maintRes.data.requests || [] });
        hydrateProfileForm(vendorProfile, userProfile);
      } catch {
        toast.error("Failed to load dashboard.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading…</div>;
  if (!data) return null;

  const { vendor, requests } = data;
  const open = requests.filter((r) => r.status === "Open").length;
  const inProgress = requests.filter((r) => r.status === "In Progress").length;
  const resolved = requests.filter((r) => r.status === "Resolved").length;
  const pendingQuotes = requests.filter((r) => r.quoteStatus === "NotSubmitted" && r.assignedVendor).length;
  const pendingPayments = requests.filter((r) => r.vendorPaymentRequest?.status === "Pending").length;
  const recent = [...requests].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 5);

  const fullNamePreview = [profileForm.firstName, profileForm.middleName, profileForm.lastName]
    .filter(Boolean)
    .join(" ");

  const toggleSpecialization = (value) => {
    setProfileForm((prev) => {
      const exists = prev.specializations.includes(value);
      const next = exists
        ? prev.specializations.filter((item) => item !== value)
        : [...prev.specializations, value];
      return {
        ...prev,
        specializations: next.length ? next : ["General"],
      };
    });
  };

  const saveVendorProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const payload = {
        ...profileForm,
        phone: (profileForm.phone || "").toString().replace(/\D/g, ""),
      };
      const { data: res } = await api.put("/vendor/profile", payload);

      setData((prev) => ({
        ...prev,
        vendor: res.vendor || prev.vendor,
        user: res.user || prev.user,
      }));
      hydrateProfileForm(res.vendor || data.vendor, res.user || data.user);

      if (token && res.user?._id) {
        dispatch(
          setCredentials({
            user: {
              ...user,
              ...res.user,
            },
            token,
          })
        );
      }

      toast.success("Vendor profile updated.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update vendor profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const updatePassword = async (e) => {
    e.preventDefault();
    if (!passwordForm.password || !passwordForm.confirmPassword) {
      toast.error("Please enter and confirm your new password.");
      return;
    }
    if (passwordForm.password !== passwordForm.confirmPassword) {
      toast.error("Password and confirm password must match.");
      return;
    }
    setSavingPassword(true);
    try {
      await api.put("/auth/profile", {
        password: passwordForm.password,
        confirmPassword: passwordForm.confirmPassword,
      });
      setPasswordForm({ password: "", confirmPassword: "" });
      toast.success("Password updated successfully.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update password.");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${vendor?.name || "Vendor"}`}
        subtitle="Manage your assigned maintenance jobs"
      />

      {/* Hero banner */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-emerald-900 to-teal-900 px-6 py-7 sm:px-8 shadow-xl">
        <div className="absolute -top-12 -right-10 h-28 w-28 rounded-full bg-emerald-400/20 blur-2xl" />
        <div className="absolute -bottom-12 -left-10 h-32 w-32 rounded-full bg-teal-400/20 blur-2xl" />
        <div className="relative grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-emerald-200 font-semibold">Vendor Portal</p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-white">Track jobs, submit quotes, get paid.</h2>
            <p className="mt-2 text-sm text-emerald-100 max-w-md">
              Your assigned maintenance requests, payment status and work history — all in one place.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {(vendor?.specializations || []).map((s) => {
                const Icon = SPEC_ICON[s] || Wrench;
                return (
                  <span key={s} className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white">
                    <Icon size={12} /> {s}
                  </span>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-wider text-emerald-200 font-semibold">Total Jobs</p>
              <p className="mt-2 text-3xl font-extrabold text-white">{requests.length}</p>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-wider text-emerald-200 font-semibold">Resolved</p>
              <p className="mt-2 text-3xl font-extrabold text-white">{resolved}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats grid */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: "Open", value: open, color: "red", icon: AlertCircle },
          { label: "In Progress", value: inProgress, color: "amber", icon: Clock3 },
          { label: "Quotes to Submit", value: pendingQuotes, color: "violet", icon: ClipboardList },
          { label: "Pending Payments", value: pendingPayments, color: "emerald", icon: BadgeIndianRupee },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className={`rounded-2xl border p-5 shadow-sm bg-white border-${color}-100`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</p>
                <p className={`mt-2 text-3xl font-extrabold text-${color}-700`}>{value}</p>
              </div>
              <div className={`rounded-xl bg-${color}-50 border border-${color}-100 p-2`}>
                <Icon size={18} className={`text-${color}-600`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent requests */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Recent Assignments</h3>
          <Link to="/vendor/maintenance" className="text-xs font-semibold text-indigo-600 hover:underline inline-flex items-center gap-1">
            View all <ArrowRight size={12} />
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="p-6"><EmptyState message="No maintenance requests assigned yet." icon={Wrench} /></div>
        ) : (
          <div className="divide-y divide-gray-50">
            {recent.map((r) => (
              <div key={r._id} className="px-5 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{r.category} — {r.property?.address?.city || "N/A"}</p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{r.description}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-gray-100 text-gray-600 border-gray-200">
                        {r.status}
                      </span>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${quoteStatusPill(r.quoteStatus)}`}>
                        Quote: {r.quoteStatus}
                      </span>
                      {r.vendorPaymentRequest?.status && r.vendorPaymentRequest.status !== "NotRaised" && (
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${payStatusPill(r.vendorPaymentRequest.status)}`}>
                          Pay: {r.vendorPaymentRequest.status}
                        </span>
                      )}
                    </div>
                  </div>
                  <Link
                    to={`/vendor/maintenance/${r._id}`}
                    className="shrink-0 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                  >
                    Open
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 rounded-2xl border border-gray-100 bg-white shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <UserCircle2 size={18} className="text-teal-600" />
            <h3 className="text-lg font-bold text-gray-900">Vendor Profile</h3>
          </div>

          <form onSubmit={saveVendorProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                className="input-field"
                placeholder="First Name"
                value={profileForm.firstName}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, firstName: e.target.value }))}
                required
              />
              <input
                className="input-field"
                placeholder="Middle Name"
                value={profileForm.middleName}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, middleName: e.target.value }))}
              />
              <input
                className="input-field"
                placeholder="Last Name"
                value={profileForm.lastName}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, lastName: e.target.value }))}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                className="input-field"
                placeholder="Email"
                type="email"
                value={profileForm.email}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, email: e.target.value }))}
                required
              />
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <input
                  className="input-field"
                  placeholder="Code"
                  value={profileForm.countryCode}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, countryCode: e.target.value }))}
                />
                <input
                  className="input-field"
                  placeholder="Phone"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                className="input-field"
                placeholder="Service / Company Name"
                value={profileForm.vendorName}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, vendorName: e.target.value }))}
              />
              <input
                className="input-field"
                placeholder="City"
                value={profileForm.city}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, city: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 mb-2 block">Specializations</label>
              <div className="flex flex-wrap gap-2">
                {SPEC_OPTIONS.map((option) => {
                  const active = profileForm.specializations.includes(option);
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => toggleSpecialization(option)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors ${
                        active
                          ? "bg-teal-600 text-white border-teal-600"
                          : "bg-white text-gray-600 border-gray-200 hover:border-teal-300 hover:text-teal-700"
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>

            <textarea
              className="input-field min-h-[96px]"
              placeholder="About your service (optional)"
              value={profileForm.notes}
              onChange={(e) => setProfileForm((prev) => ({ ...prev, notes: e.target.value }))}
            />

            <div className="flex items-center justify-between pt-1">
              <p className="text-xs text-gray-500">Display name preview: <span className="font-semibold text-gray-700">{fullNamePreview || "-"}</span></p>
              <button
                type="submit"
                disabled={savingProfile}
                className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
              >
                {savingProfile ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />} Save Profile
              </button>
            </div>
          </form>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-indigo-600" />
            <h3 className="text-lg font-bold text-gray-900">Account Security</h3>
          </div>

          <p className="text-sm text-gray-600">
            Default vendor password is common at onboarding. Update your password here after first login.
          </p>

          <form onSubmit={updatePassword} className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">New Password</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  className="input-field"
                  style={{ paddingLeft: "2rem" }}
                  value={passwordForm.password}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, password: e.target.value }))}
                  minLength={6}
                  required
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Confirm New Password</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  className="input-field"
                  style={{ paddingLeft: "2rem" }}
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                  minLength={6}
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={savingPassword}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {savingPassword ? <RefreshCw size={14} className="animate-spin" /> : <ShieldCheck size={14} />} Update Password
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default VendorDashboard;
