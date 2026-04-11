import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import {
  Building2, Eye, EyeOff, Home, Users, DollarSign,
  Wrench, ArrowLeft, CheckCircle2,
} from "lucide-react";
import api from "../../utils/api";
import { setCredentials } from "../../app/slices/authSlice";

const FEATURES = [
  { icon: Home,       text: "Manage all your properties in one place" },
  { icon: Users,      text: "Tenant onboarding & lease management" },
  { icon: DollarSign, text: "Rent tracking — Paid, Pending, Overdue" },
  { icon: Wrench,     text: "Maintenance requests resolved faster" },
];

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/signin", form);
      dispatch(setCredentials({ user: data.user, token: data.token }));
      toast.success(`Welcome back, ${data.user.name}!`);
      navigate(data.user.role === "owner" ? "/owner/dashboard" : "/tenant/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">

      {/* ── LEFT PANEL ── */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 p-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/20 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl pointer-events-none" />

        <div className="relative">
          <Link to="/" className="inline-flex items-center gap-2.5 group">
            <div className="p-2 bg-white/20 rounded-xl group-hover:bg-white/30 transition-colors">
              <Building2 size={24} className="text-white" />
            </div>
            <span className="text-white font-bold text-xl">PropManager</span>
          </Link>
        </div>

        <div className="relative space-y-8">
          <div>
            <h2 className="text-4xl font-extrabold text-white leading-tight">
              Your properties,<br />perfectly organised.
            </h2>
            <p className="text-blue-200 mt-3 text-base leading-relaxed max-w-sm">
              Everything you need to manage properties, tenants, rent and maintenance — in one clean dashboard.
            </p>
          </div>
          <ul className="space-y-4">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/15 rounded-lg flex items-center justify-center shrink-0">
                  <Icon size={16} className="text-blue-300" />
                </div>
                <span className="text-blue-100 text-sm">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20">
          <p className="text-blue-100 text-sm italic leading-relaxed">
            &ldquo;PropManager replaced three spreadsheets and two WhatsApp groups. My rent tracking is finally stress-free.&rdquo;
          </p>
          <div className="flex items-center gap-3 mt-4">
            <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center text-white font-bold text-xs">RM</div>
            <div>
              <p className="text-white text-sm font-semibold">Rajesh Mehta</p>
              <p className="text-blue-300 text-xs">Property Owner — 12 units</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 bg-white">
        <div className="w-full max-w-md mb-8">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 transition-colors">
            <ArrowLeft size={15} /> Back to home
          </Link>
        </div>

        <div className="lg:hidden flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mb-3 shadow-lg">
            <Building2 size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">PropManager</h1>
        </div>

        <div className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="text-3xl font-extrabold text-gray-900">Welcome back</h2>
            <p className="text-gray-500 mt-2 text-sm">Enter your credentials to access your dashboard.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email address</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                placeholder="you@example.com"
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  placeholder="••••••••"
                  className="input-field pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <div className="mt-2 text-right">
                <Link to="/forgot-password" className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline">
                  Forgot password?
                </Link>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-base font-semibold rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/25 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Signing in...
                </span>
              ) : "Sign In"}
            </button>
          </form>

          <div className="relative flex items-center my-6">
            <div className="flex-grow border-t border-gray-200" />
            <span className="px-4 text-xs text-gray-400 bg-white">New to PropManager?</span>
            <div className="flex-grow border-t border-gray-200" />
          </div>

          <Link
            to="/register"
            className="flex items-center justify-center w-full border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 text-gray-700 font-semibold py-3 rounded-xl transition-all duration-200 text-sm"
          >
            Create a free account
          </Link>

          <div className="flex items-center justify-center gap-5 mt-8 text-xs text-gray-400">
            {["Secure login", "Role-based access", "No ads"].map((t) => (
              <span key={t} className="flex items-center gap-1">
                <CheckCircle2 size={12} className="text-green-500" /> {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
