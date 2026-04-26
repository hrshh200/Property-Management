import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import { Building2, Eye, EyeOff, Wrench, ClipboardList, Camera, BadgeCheck } from "lucide-react";
import api from "../../utils/api";
import { setCredentials } from "../../app/slices/authSlice";

const STEPS = [
  { icon: ClipboardList, text: "See all assigned maintenance jobs" },
  { icon: Camera, text: "Upload work-done photos" },
  { icon: BadgeCheck, text: "Submit quotes & raise payment requests" },
  { icon: Wrench, text: "Mark jobs complete instantly" },
];

const VendorRegister = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirmPassword: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post("/auth/vendor-register", {
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
        confirmPassword: form.confirmPassword,
      });
      dispatch(setCredentials({ user: data.user, token: data.token }));
      toast.success("Welcome to your vendor portal!");
      navigate("/vendor/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#f0fdf4_0%,#f8fafc_50%,#ecfeff_100%)] lg:grid lg:grid-cols-2 overflow-hidden">
      {/* Left panel */}
      <div className="relative hidden lg:flex flex-col justify-center overflow-hidden bg-[linear-gradient(145deg,#0f172a_0%,#065f46_62%,#0f766e_100%)] px-10 py-10 xl:px-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:24px_24px] opacity-60" />
        <div className="absolute -top-20 right-0 h-56 w-56 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-48 w-48 -translate-x-1/3 translate-y-1/3 rounded-full bg-teal-400/20 blur-3xl" />
        <div className="relative max-w-md">
          <Link to="/" className="inline-flex items-center gap-3 group mb-8">
            <div className="p-2 rounded-2xl bg-white/15 border border-white/20 group-hover:bg-white/20 transition-colors">
              <Building2 size={22} className="text-white" />
            </div>
            <div>
              <p className="text-white font-extrabold text-lg tracking-tight">PropManager</p>
              <p className="text-emerald-100/80 text-[11px] uppercase tracking-[0.2em]">Vendor Portal</p>
            </div>
          </Link>
          <h1 className="text-3xl xl:text-4xl font-extrabold text-white leading-tight">
            Join the vendor network.
            <span className="block text-emerald-300 mt-1">Get jobs. Get paid.</span>
          </h1>
          <p className="mt-4 text-emerald-100/70 text-sm leading-relaxed">
            Your email must match the record added to our vendor directory by the admin.
            Once registered, you can track work and manage payments directly from your portal.
          </p>
          <ul className="mt-8 space-y-4">
            {STEPS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center">
                  <Icon size={16} className="text-emerald-300" />
                </div>
                <span className="text-white/80 text-sm">{text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex items-center justify-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="p-2 rounded-xl bg-emerald-100 border border-emerald-200">
              <Building2 size={20} className="text-emerald-700" />
            </div>
            <p className="font-extrabold text-gray-900 text-lg">PropManager — Vendor Portal</p>
          </div>

          <h2 className="text-2xl font-extrabold text-gray-900">Create your vendor account</h2>
          <p className="mt-1 text-sm text-gray-500">
            Already registered?{" "}
            <Link to="/login" className="font-semibold text-emerald-600 hover:underline">
              Sign in
            </Link>
          </p>

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                placeholder="Your name as on vendor record"
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                required
                placeholder="Must match vendor directory email"
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                required
                placeholder="Your contact number"
                className="input-field w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <input
                  name="password"
                  type={showPw ? "text" : "password"}
                  value={form.password}
                  onChange={handleChange}
                  required
                  minLength={6}
                  placeholder="Min. 6 characters"
                  className="input-field w-full pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <input
                name="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={handleChange}
                required
                placeholder="Re-enter password"
                className="input-field w-full"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-2 py-2.5"
            >
              {loading ? "Creating account…" : "Create Vendor Account"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-gray-400">
            Your email must be registered in the vendor directory by an admin before you can sign up.{" "}
            <Link to="/vendor-onboarding" className="text-emerald-600 hover:underline font-medium">
              Apply to join
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default VendorRegister;
