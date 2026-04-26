import React, { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import {
  Building2, Eye, EyeOff, Home, Users, DollarSign,
  Wrench, CheckCircle2,
} from "lucide-react";
import api from "../../utils/api";
import { setCredentials } from "../../app/slices/authSlice";
import { Alert } from "../../components/UI";

const FEATURES = [
  { icon: Home,       text: "Manage all your properties in one place" },
  { icon: Users,      text: "Tenant onboarding & lease management" },
  { icon: DollarSign, text: "Rent tracking — Paid, Pending, Overdue" },
  { icon: Wrench,     text: "Maintenance requests resolved faster" },
];

const submitPendingInquiryIfAny = async () => {
  const rawPendingInquiry = localStorage.getItem("pendingPropertyInquiry");
  if (!rawPendingInquiry) return;

  try {
    const pendingInquiry = JSON.parse(rawPendingInquiry);
    if (!pendingInquiry?.propertyId) {
      localStorage.removeItem("pendingPropertyInquiry");
      return;
    }

    await api.post(`/properties/${pendingInquiry.propertyId}/inquiries`, {
      message: pendingInquiry.message || "I am interested in this property.",
    });
    localStorage.removeItem("pendingPropertyInquiry");
    toast.success("Your property inquiry has been submitted.");
  } catch (err) {
    const status = err?.response?.status;
    if ([400, 404, 409].includes(status)) {
      localStorage.removeItem("pendingPropertyInquiry");
      return;
    }
    toast.error("Logged in, but inquiry could not be submitted right now.");
  }
};

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const errorRef = useRef(null);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/signin", form);
      dispatch(setCredentials({ user: data.user, token: data.token }));
      await submitPendingInquiryIfAny();
      toast.success(`Welcome back, ${data.user.name}!`);
      navigate(
        data.user.role === "admin"
          ? "/admin/dashboard"
          : data.user.role === "owner"
            ? "/owner/dashboard"
            : data.user.role === "vendor"
              ? "/vendor/dashboard"
              : "/tenant/dashboard"
      );
    } catch {
      const msg = "Invalid username or password. Please provide valid credentials.";
      setErrorMsg(msg);
      if (errorRef.current) {
        errorRef.current.removeAttribute("hidden");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#eff6ff_0%,#f8fafc_50%,#ecfeff_100%)] lg:grid lg:grid-cols-2 overflow-hidden">

      <div className="relative hidden lg:flex flex-col justify-center overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.22),transparent_32%),linear-gradient(145deg,#0f172a_0%,#1d4ed8_62%,#0f766e_100%)] px-10 py-10 xl:px-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.07)_1px,transparent_1px)] bg-[size:24px_24px] opacity-70" />
        <div className="absolute -top-20 right-0 h-56 w-56 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-48 w-48 -translate-x-1/3 translate-y-1/3 rounded-full bg-emerald-300/20 blur-3xl" />

        <div className="relative max-w-md">
          <Link to="/" className="inline-flex items-center gap-3 group">
            <div className="p-2 rounded-2xl bg-white/15 border border-white/20 group-hover:bg-white/20 transition-colors">
              <Building2 size={22} className="text-white" />
            </div>
            <div>
              <p className="text-white font-extrabold text-lg tracking-tight">PropManager</p>
              <p className="text-cyan-100/80 text-[11px] uppercase tracking-[0.2em]">Secure access</p>
            </div>
          </Link>

          <h1 className="mt-8 text-3xl font-black leading-tight text-white xl:text-4xl">
            Sign in and keep your property operations in one place.
          </h1>
          <p className="mt-3 text-sm leading-6 text-blue-100/85">
            Rent tracking, tenants, leases, maintenance, and inquiries from one focused dashboard.
          </p>

          <ul className="mt-8 grid gap-3">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-3.5 py-3 text-sm text-blue-50/90 backdrop-blur-sm">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/15 bg-white/10">
                  <Icon size={15} className="text-cyan-100" />
                </span>
                {text}
              </li>
            ))}
          </ul>

          <div className="mt-8 rounded-[24px] border border-white/15 bg-white/10 p-4 backdrop-blur-md">
            <p className="text-sm italic leading-6 text-blue-50/90">
              &ldquo;My rent tracking is finally stress-free.&rdquo;
            </p>
            <p className="mt-3 text-xs font-semibold text-cyan-100/80">Rajesh Mehta, Property Owner</p>
          </div>
        </div>
      </div>

      <div className="relative flex items-center justify-center px-5 py-6 sm:px-8 lg:px-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.10),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(20,184,166,0.08),transparent_26%)]" />

        <div className="relative w-full max-w-md">

          <div className="lg:hidden mb-4 overflow-hidden rounded-[24px] bg-[linear-gradient(145deg,#0f172a_0%,#1d4ed8_62%,#0f766e_100%)] p-4 shadow-[0_16px_36px_rgba(37,99,235,0.18)]">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 text-white">
                <Building2 size={22} />
              </div>
              <div>
                <p className="text-lg font-black text-white">PropManager</p>
                <p className="text-xs text-blue-100/80">Simple property operations</p>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/70 bg-white/88 p-5 shadow-[0_22px_56px_rgba(15,23,42,0.10)] backdrop-blur-xl sm:p-6">
            <div className="mb-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-600">Welcome back</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-[30px]">Log in to your workspace</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Enter your credentials to continue.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Email address</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  placeholder="you@example.com"
                  className="input-field bg-slate-50/80 py-2.5 text-sm"
                />
              </div>
              <div>
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <label className="block text-sm font-semibold text-slate-700">Password</label>
                  <Link to="/forgot-password" className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    required
                    placeholder="••••••••"
                    className="input-field bg-slate-50/80 py-2.5 pr-10 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3 text-sm font-semibold rounded-2xl transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/25 disabled:opacity-60 disabled:cursor-not-allowed"
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

              <div ref={errorRef} hidden className="mt-4">
                <Alert
                  type="error"
                  title="Login Failed"
                  message={errorMsg || "Invalid username or password. Please provide valid credentials."}
                />
              </div>
            </form>

            <div className="relative my-5 flex items-center">
              <div className="flex-grow border-t border-slate-200" />
              <span className="bg-white px-4 text-xs text-slate-400">New to PropManager?</span>
              <div className="flex-grow border-t border-slate-200" />
            </div>

            <Link
              to="/register"
              className="flex items-center justify-center w-full rounded-2xl border-2 border-slate-200 bg-slate-50/70 py-3 text-sm font-semibold text-slate-700 transition-all duration-200 hover:border-blue-300 hover:bg-blue-50"
            >
              Create a free account
            </Link>

            <div className="flex items-center gap-3 py-1">
              <div className="flex-grow border-t border-slate-200" />
              <span className="bg-white px-4 text-xs text-slate-400">Are you a vendor?</span>
              <div className="flex-grow border-t border-slate-200" />
            </div>

            <div className="w-full rounded-2xl border-2 border-teal-200 bg-teal-50/70 px-4 py-3 text-sm text-teal-800">
              <p className="font-semibold">Vendor access is admin-approved.</p>
              <p className="mt-1 text-xs text-teal-700">
                Once your vendor request is approved by Admin, use your approved email and the common default password to log in.
              </p>
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-3">
              {["Secure login", "Role-based access", "No ads"].map((t) => (
                <div key={t} className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-[11px] font-medium text-slate-500">
                  <CheckCircle2 size={13} className="text-emerald-500" />
                  {t}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
