import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { User, Mail, Phone, ShieldCheck, Save, RefreshCw } from "lucide-react";
import { PageHeader } from "../components/UI";
import { setCredentials } from "../app/slices/authSlice";
import api from "../utils/api";

const COUNTRY_CODES = [
  { value: "+1", label: "US (+1)" },
  { value: "+44", label: "UK (+44)" },
  { value: "+61", label: "AU (+61)" },
  { value: "+65", label: "SG (+65)" },
  { value: "+91", label: "IN (+91)" },
  { value: "+971", label: "AE (+971)" },
];

const Profile = () => {
  const dispatch = useDispatch();
  const { user, token } = useSelector((state) => state.auth);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    countryCode: "+91",
    phone: "",
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await api.get("/auth/profile");
        const userProfile = data.user || {};
        const fallbackCode = userProfile.countryCode || "+91";
        const rawPhone = (userProfile.phone || "").toString();
        const normalizedPhone = rawPhone.startsWith(fallbackCode)
          ? rawPhone.slice(fallbackCode.length)
          : rawPhone.replace(/\D/g, "");

        setForm({
          firstName: userProfile.firstName || "",
          middleName: userProfile.middleName || "",
          lastName: userProfile.lastName || "",
          email: userProfile.email || "",
          countryCode: fallbackCode,
          phone: normalizedPhone,
        });
      } catch {
        toast.error("Failed to load profile.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const cleanedPhone = (form.phone || "").replace(/\D/g, "");
    if (cleanedPhone.length < 6 || cleanedPhone.length > 15) {
      toast.error("Please enter a valid mobile number.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        firstName: form.firstName.trim(),
        middleName: form.middleName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        countryCode: form.countryCode,
        phone: cleanedPhone,
      };

      const { data } = await api.put("/auth/profile", payload);

      dispatch(
        setCredentials({
          user: {
            ...user,
            ...data.user,
          },
          token,
        })
      );

      toast.success("Profile updated successfully.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400">Loading profile...</div>;
  }

  return (
    <div className="space-y-6 pt-14 lg:pt-0">
      <PageHeader
        title="My Profile"
        subtitle="Manage your personal details and account information"
      />

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 px-6 py-7 sm:px-8 shadow-xl">
        <div className="absolute -top-10 -right-8 h-28 w-28 rounded-full bg-blue-400/20 blur-2xl" />
        <div className="absolute -bottom-10 -left-8 h-32 w-32 rounded-full bg-indigo-400/20 blur-2xl" />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-5 text-white">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-blue-200 font-semibold">Account Center</p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold">Keep your profile up to date</h2>
            <p className="mt-2 text-sm text-blue-100 max-w-xl">
              Your account details are used across all modules for better visibility and communication.
            </p>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm w-full md:w-auto md:min-w-[220px]">
            <p className="text-xs uppercase tracking-wider text-blue-200 font-semibold">Role</p>
            <p className="mt-1 text-xl font-bold capitalize">{user?.role || "User"}</p>
            <p className="mt-1 text-xs text-blue-100">Secure JWT authenticated account</p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        <div className="xl:col-span-1 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm xl:sticky xl:top-8">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Account Snapshot</h3>
          <div className="space-y-3 text-sm">
            <div className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-2">
              <p className="text-xs text-gray-500">Name</p>
              <p className="font-semibold text-gray-900 break-words">{[user?.firstName, user?.middleName, user?.lastName].filter(Boolean).join(" ") || user?.name || "-"}</p>
            </div>
            <div className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-2">
              <p className="text-xs text-gray-500">Email</p>
              <p className="font-semibold text-gray-900 break-all">{user?.email || "-"}</p>
            </div>
            <div className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-2">
              <p className="text-xs text-gray-500">Phone</p>
              <p className="font-semibold text-gray-900 break-words">{user?.phone || "Not added"}</p>
            </div>
            <div className="rounded-xl bg-blue-50 border border-blue-100 px-3 py-2 text-blue-800 flex items-center gap-2">
              <ShieldCheck size={16} />
              <span className="text-xs font-medium">Profile changes are saved securely.</span>
            </div>
          </div>
        </div>

        <div className="xl:col-span-2 rounded-2xl border border-gray-100 bg-white p-5 sm:p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-5">Edit Profile</h3>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">First Name</label>
                <div className="flex items-center rounded-lg border border-gray-300 overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
                  <div className="px-3 py-2.5 bg-gray-50 border-r border-gray-200 text-gray-500 flex items-center">
                    <User size={16} />
                  </div>
                  <input
                    type="text"
                    name="firstName"
                    value={form.firstName}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2.5 text-sm text-gray-700 outline-none"
                    placeholder="First name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Middle Name</label>
                <input
                  type="text"
                  name="middleName"
                  value={form.middleName}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 text-sm text-gray-700 outline-none border border-gray-300 rounded-lg"
                  placeholder="Middle name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  value={form.lastName}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2.5 text-sm text-gray-700 outline-none border border-gray-300 rounded-lg"
                  placeholder="Last name"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <div className="flex items-center rounded-lg border border-gray-300 overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
                <div className="px-3 py-2.5 bg-gray-50 border-r border-gray-200 text-gray-500 flex items-center">
                  <Mail size={16} />
                </div>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2.5 text-sm text-gray-700 outline-none"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Mobile Number</label>
              <div className="grid grid-cols-[130px_1fr] gap-2">
                <select
                  name="countryCode"
                  value={form.countryCode}
                  onChange={handleChange}
                  className="input-field"
                >
                  {COUNTRY_CODES.map((code) => (
                    <option key={code.value} value={code.value}>{code.label}</option>
                  ))}
                </select>
                <div className="flex items-center rounded-lg border border-gray-300 overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
                  <div className="px-3 py-2.5 bg-gray-50 border-r border-gray-200 text-gray-500 flex items-center">
                    <Phone size={16} />
                  </div>
                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2.5 text-sm text-gray-700 outline-none"
                    placeholder="Mobile number"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Role (read-only)</label>
              <div className="flex items-center rounded-lg border border-gray-300 overflow-hidden bg-gray-50">
                <input
                  type="text"
                  value={user?.role || "User"}
                  disabled
                  className="w-full px-3 py-2.5 text-sm text-gray-500 bg-gray-50 cursor-not-allowed outline-none"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Save size={16} /> Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;
