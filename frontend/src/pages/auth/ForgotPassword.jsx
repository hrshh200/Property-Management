import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, Building2, Eye, EyeOff, KeyRound, Mail, ShieldCheck } from "lucide-react";
import api from "../../utils/api";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.password !== form.confirmPassword) {
      toast.error("Password and confirm password must match.");
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post("/auth/forgot-password", {
        email: form.email.trim(),
        password: form.password,
        confirmPassword: form.confirmPassword,
      });
      toast.success(data.message || "Password reset successful.");
      navigate("/login");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white">
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-gradient-to-br from-amber-700 via-orange-700 to-red-800 p-12 relative overflow-hidden">
        <div className="absolute -top-16 -right-10 h-72 w-72 rounded-full bg-orange-300/20 blur-3xl" />
        <div className="absolute -bottom-16 -left-10 h-72 w-72 rounded-full bg-yellow-300/20 blur-3xl" />

        <Link to="/" className="inline-flex items-center gap-2.5 relative z-10">
          <div className="p-2 bg-white/20 rounded-xl">
            <Building2 size={24} className="text-white" />
          </div>
          <span className="text-white font-bold text-xl">PropManager</span>
        </Link>

        <div className="relative z-10 max-w-md space-y-4 text-white">
          <p className="text-xs uppercase tracking-[0.18em] text-amber-100 font-semibold">Account Recovery</p>
          <h1 className="text-4xl font-extrabold leading-tight">Reset your password securely</h1>
          <p className="text-amber-100 text-sm leading-relaxed">
            Enter your registered email and set a new password. You can sign in again immediately after reset.
          </p>
          <div className="rounded-2xl bg-white/10 border border-white/20 p-4 backdrop-blur-sm">
            <p className="text-sm text-amber-50 inline-flex items-center gap-2">
              <ShieldCheck size={16} /> Protected with secure hashing before storage.
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center items-center px-6 py-10">
        <div className="w-full max-w-md mb-6">
          <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-orange-600 transition-colors">
            <ArrowLeft size={15} /> Back to sign in
          </Link>
        </div>

        <div className="w-full max-w-md rounded-3xl border border-gray-100 bg-white p-6 sm:p-7 shadow-xl">
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
              <KeyRound size={14} /> Forgot Password
            </div>
            <h2 className="mt-3 text-3xl font-extrabold text-gray-900">Set a new password</h2>
            <p className="text-gray-500 mt-2 text-sm">Use your account email and choose a strong password.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email address</label>
              <div className="flex items-center rounded-xl border border-gray-300 overflow-hidden focus-within:ring-2 focus-within:ring-orange-500 focus-within:border-transparent">
                <div className="px-3 py-2.5 bg-gray-50 border-r border-gray-200 text-gray-500">
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
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">New Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  minLength={6}
                  placeholder="Min 6 characters"
                  className="input-field pr-10"
                />
                <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  required
                  minLength={6}
                  placeholder="Re-enter new password"
                  className="input-field pr-10"
                />
                <button type="button" onClick={() => setShowConfirmPassword((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-orange-600 to-red-600 py-3 text-white font-semibold hover:from-orange-700 hover:to-red-700 transition-all shadow-lg shadow-orange-500/20 disabled:opacity-60"
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;