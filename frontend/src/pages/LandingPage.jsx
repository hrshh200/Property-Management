import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Building2, Home, Users, DollarSign, Wrench, Shield,
  BarChart3, Bell, ChevronRight, Star, CheckCircle2,
  ArrowRight, Menu, X, MapPin, TrendingUp, Clock, Plus, Minus,
} from "lucide-react";
import { formatCurrencyCompact, formatCurrency } from "../utils/currency";

/* ─── tiny hook: count-up animation ─── */
const useCountUp = (target, duration = 1800) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = Math.ceil(target / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(start);
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return count;
};

const StatItem = ({ value, suffix = "", label }) => {
  const animated = useCountUp(value);
  return (
    <div className="text-center">
      <p className="text-4xl font-extrabold text-white tracking-tight">
        {animated.toLocaleString()}{suffix}
      </p>
      <p className="text-blue-200 text-sm mt-1 font-medium">{label}</p>
    </div>
  );
};

const FEATURES = [
  {
    icon: Home,
    color: "bg-blue-50 text-blue-600",
    title: "Property Management",
    desc: "Add, edit and track all your properties — Home, Flat, Office or Shop — from a single dashboard.",
  },
  {
    icon: Users,
    color: "bg-purple-50 text-purple-600",
    title: "Tenant & Lease Tracking",
    desc: "Onboard tenants instantly, set lease dates, rent amounts and security deposits in minutes.",
  },
  {
    icon: DollarSign,
    color: "bg-green-50 text-green-600",
    title: "Rent Collection",
    desc: "Generate monthly rent records, track Paid / Pending / Overdue status and mark payments with one click.",
  },
  {
    icon: Wrench,
    color: "bg-orange-50 text-orange-600",
    title: "Maintenance Requests",
    desc: "Tenants raise requests; owners update status in real time with threaded comments — no phone tag.",
  },
  {
    icon: BarChart3,
    color: "bg-indigo-50 text-indigo-600",
    title: "Insightful Dashboard",
    desc: "Visual charts for occupancy rates, rent collected and open maintenance — everything at a glance.",
  },
  {
    icon: Shield,
    color: "bg-red-50 text-red-600",
    title: "Role-Based Access",
    desc: "Owners get full control. Tenants see only their data. JWT-secured, no credential leaks.",
  },
];

const HOW_IT_WORKS = [
  { step: "01", title: "Create your account", desc: "Sign up as a Property Owner in under 60 seconds." },
  { step: "02", title: "Add your properties", desc: "Enter address, type and unit count — done in two clicks." },
  { step: "03", title: "Assign tenants", desc: "Set lease terms, rent amount and due date for each unit." },
  { step: "04", title: "Manage from anywhere", desc: "Track rent, maintenance and vacancies on any device." },
];

const TESTIMONIALS = [
  {
    name: "Rajesh Mehta",
    role: "Property Owner — 12 units",
    avatar: "RM",
    stars: 5,
    text: "PropManager replaced three spreadsheets and two WhatsApp groups. My rent tracking is finally stress-free.",
  },
  {
    name: "Priya Sharma",
    role: "Tenant",
    avatar: "PS",
    stars: 5,
    text: "I love seeing my rent history and raising maintenance requests without having to chase my landlord.",
  },
  {
    name: "Amitesh Patel",
    role: "Property Owner — 6 units",
    avatar: "AP",
    stars: 5,
    text: "The vacancy tracking alone saved me weeks of effort. Highly recommend to any landlord.",
  },
];

const FAQ_ITEMS = [
  {
    q: "How do I add a property?",
    a: "Sign in as an owner, open Properties, and create a new property with unit and location details.",
  },
  {
    q: "Can tenants raise maintenance requests?",
    a: "Yes. Tenants can submit requests from their dashboard and track status updates in real time.",
  },
  {
    q: "Can I track paid and pending rent?",
    a: "Yes. Rent management shows paid, pending, and overdue statuses for each lease.",
  },
  {
    q: "Is PropManager mobile friendly?",
    a: "Yes. The app is designed to work across desktop, tablet, and mobile browsers.",
  },
];

const LandingPage = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-x-hidden">

      {/* ── NAVBAR ── */}
      <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? "bg-white/95 backdrop-blur shadow-sm" : "bg-transparent"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5">
            <div className="p-1.5 bg-blue-600 rounded-xl shadow">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-gray-900">PropManager</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <a href="#features" className="hover:text-blue-600 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-blue-600 transition-colors">How it works</a>
            <a href="#testimonials" className="hover:text-blue-600 transition-colors">Reviews</a>
          </nav>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors px-3 py-2">
              Sign In
            </Link>
            <Link to="/register" className="text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm">
              Get Started Free
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 rounded-lg hover:bg-gray-100">
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-3">
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="block text-sm font-medium text-gray-700 py-2">Features</a>
            <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="block text-sm font-medium text-gray-700 py-2">How it works</a>
            <a href="#testimonials" onClick={() => setMobileMenuOpen(false)} className="block text-sm font-medium text-gray-700 py-2">Reviews</a>
            <div className="flex gap-3 pt-2">
              <Link to="/login" className="flex-1 text-center border border-gray-200 text-sm font-medium text-gray-700 py-2 rounded-lg">Sign In</Link>
              <Link to="/register" className="flex-1 text-center bg-blue-600 text-sm font-semibold text-white py-2 rounded-lg">Get Started</Link>
            </div>
          </div>
        )}
      </header>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-900 pt-16">
        {/* Animated blobs */}
        <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-blue-500/15 rounded-full blur-3xl pointer-events-none animate-blob" />
        <div className="absolute bottom-10 left-0 w-[400px] h-[400px] bg-indigo-500/15 rounded-full blur-3xl pointer-events-none animate-blob-delay" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/8 rounded-full blur-3xl pointer-events-none" />
        {/* Dot grid texture */}
        <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:32px_32px]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32 grid lg:grid-cols-2 gap-16 items-center">
          {/* Left */}
          <div className="animate-fade-up">
            <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold px-3.5 py-1.5 rounded-full mb-6 shadow-inner">
              <Star size={11} className="fill-blue-400 text-blue-400" />
              Trusted Property Management Platform
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-[1.1] tracking-tight">
              Manage Properties
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-sky-300 mt-2">
                Without the Chaos
              </span>
            </h1>
            <p className="text-blue-100/80 text-lg mt-6 leading-relaxed max-w-lg">
              PropManager puts rent tracking, tenant onboarding, maintenance requests and vacancy management in one clean dashboard — no spreadsheets required.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mt-10">
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 btn-shimmer text-white font-bold px-6 py-3.5 rounded-xl transition-all duration-200 shadow-lg shadow-blue-600/40 hover:shadow-blue-400/50 group"
              >
                Start for Free
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold px-6 py-3.5 rounded-xl transition-all duration-200 backdrop-blur-sm"
              >
                Sign In
              </Link>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap items-center gap-5 mt-10 text-sm text-blue-300">
              {["Free to get started", "No credit card needed", "Role-based access"].map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <CheckCircle2 size={15} className="text-green-400" /> {t}
                </span>
              ))}
            </div>
          </div>

          {/* Right – floating card mock */}
          <div className="relative hidden lg:block">
            <div className="relative bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 shadow-2xl">
              {/* Mini dashboard preview */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <span className="text-white/50 text-xs font-mono">Dashboard</span>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  { label: "Properties", value: "24", icon: Home, color: "text-blue-400" },
                  { label: "Active Leases", value: "18", icon: Users, color: "text-purple-400" },
                  { label: "Rent Collected", value: formatCurrencyCompact(240000), icon: TrendingUp, color: "text-green-400" },
                  { label: "Open Requests", value: "3", icon: Wrench, color: "text-orange-400" },
                ].map((card) => (
                  <div key={card.label} className="bg-white/10 rounded-xl p-3 border border-white/10">
                    <card.icon size={16} className={`${card.color} mb-1.5`} />
                    <p className="text-white font-bold text-lg">{card.value}</p>
                    <p className="text-white/50 text-xs">{card.label}</p>
                  </div>
                ))}
              </div>

              {/* Mini list */}
              <div className="space-y-2">
                {[
                  { name: "Flat 4B — Andheri", status: "Paid", dot: "bg-green-400" },
                  { name: "Shop 12 — Bandra", status: "Pending", dot: "bg-yellow-400" },
                  { name: "Office 3 — BKC", status: "Overdue", dot: "bg-red-400" },
                ].map((row) => (
                  <div key={row.name} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2 border border-white/10">
                    <div className="flex items-center gap-2">
                      <MapPin size={12} className="text-white/40" />
                      <span className="text-white/80 text-xs">{row.name}</span>
                    </div>
                    <span className={`flex items-center gap-1 text-xs font-medium text-white/70`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${row.dot}`} />{row.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Floating notification badge */}
            <div className="absolute -top-4 -right-4 bg-white rounded-xl shadow-xl px-3 py-2.5 flex items-center gap-2.5 border border-gray-100">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <Bell size={16} className="text-green-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-800">Rent Received</p>
                <p className="text-xs text-gray-400">Flat 4B — {formatCurrency(25000)}</p>
              </div>
            </div>

            {/* Floating maintenance badge */}
            <div className="absolute -bottom-4 -left-4 bg-white rounded-xl shadow-xl px-3 py-2.5 flex items-center gap-2.5 border border-gray-100">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <Clock size={16} className="text-orange-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-800">Request Resolved</p>
                <p className="text-xs text-gray-400">Plumbing — Shop 12</p>
              </div>
            </div>
          </div>
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 inset-x-0">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="w-full h-16">
            <path d="M0 80L1440 80L1440 40C1320 80 1200 0 1080 40C960 80 840 0 720 40C600 80 480 0 360 40C240 80 120 0 0 40L0 80Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="bg-gradient-to-r from-blue-600 to-indigo-600 py-16">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 sm:grid-cols-4 gap-10">
          <StatItem value={1200} suffix="+" label="Properties Managed" />
          <StatItem value={850} suffix="+" label="Happy Tenants" />
          <StatItem value={98} suffix="%" label="Rent Collected On-Time" />
          <StatItem value={500} suffix="+" label="Maintenance Resolved" />
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-blue-600 uppercase tracking-widest">Everything you need</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mt-3">
              Built for Property Owners &amp; Tenants
            </h2>
            <p className="text-gray-500 mt-4 max-w-xl mx-auto text-lg">
              Every feature was designed to reduce back-and-forth and give both owners and tenants full transparency.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <div key={f.title} className="group p-6 bg-white rounded-2xl border border-gray-100 hover:border-blue-200 hover:shadow-[0_8px_40px_rgba(59,130,246,0.12)] transition-all duration-300 cursor-default">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${f.color} mb-4 group-hover:scale-110 transition-transform duration-300 shadow-sm`}>
                  <f.icon size={22} />
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-24 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-blue-600 uppercase tracking-widest">Simple process</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mt-3">Up and running in minutes</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 relative">
            {/* Connector line desktop */}
            <div className="hidden lg:block absolute top-10 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-blue-100 via-blue-400 to-blue-100" />

            {HOW_IT_WORKS.map((s, i) => (
              <div key={s.step} className="relative text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-xl shadow-blue-200 border border-blue-400/20 mb-5 text-2xl font-extrabold text-white">
                  {s.step}
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-gray-500 text-sm">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ROLES ── */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-blue-600 uppercase tracking-widest">Two roles</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mt-3">Choose your perspective</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Owner card */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-white shadow-xl">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <Building2 size={36} className="mb-5 relative" />
              <h3 className="text-2xl font-extrabold mb-3">Property Owner</h3>
              <ul className="space-y-2 text-blue-100 text-sm mb-8">
                {["Manage unlimited properties", "Assign tenants & set leases", "Track rent Paid/Pending/Overdue", "Resolve maintenance requests", "View occupancy analytics"].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-green-300 shrink-0" /> {item}
                  </li>
                ))}
              </ul>
              <Link to="/register" className="inline-flex items-center gap-2 bg-white text-blue-700 font-bold px-5 py-2.5 rounded-xl hover:bg-blue-50 transition-colors text-sm">
                Register as Owner <ChevronRight size={16} />
              </Link>
            </div>

            {/* Tenant card */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 p-8 text-white shadow-xl">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <Users size={36} className="mb-5 relative text-blue-300" />
              <h3 className="text-2xl font-extrabold mb-3">Tenant</h3>
              <ul className="space-y-2 text-slate-300 text-sm mb-8">
                {["View your property & lease", "See rent due dates clearly", "Full payment history", "Raise maintenance requests", "Track request status live"].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-green-400 shrink-0" /> {item}
                  </li>
                ))}
              </ul>
              <Link to="/register" className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-400 text-white font-bold px-5 py-2.5 rounded-xl transition-colors text-sm">
                Register as Tenant <ChevronRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section id="testimonials" className="py-24 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-blue-600 uppercase tracking-widest">What users say</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mt-3">Loved by owners &amp; tenants</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="relative bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-xl hover:border-blue-100 transition-all duration-300 group overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-t-2xl" />
                <div className="absolute top-4 right-5 text-6xl font-serif text-gray-100 leading-none select-none">&ldquo;</div>
                <div className="flex gap-1 mb-4 relative">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <Star key={i} size={15} className="fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-gray-600 text-sm leading-relaxed mb-5 relative">{t.text}</p>
                <div className="flex items-center gap-3 relative">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
                    <p className="text-gray-400 text-xs">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="py-24 bg-gradient-to-br from-blue-700 via-indigo-700 to-purple-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:28px_28px]" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl animate-blob" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-purple-400/20 rounded-full blur-3xl animate-blob-delay" />
        <div className="relative max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white mb-5 leading-tight">
            Ready to simplify your property management?
          </h2>
          <p className="text-indigo-200 text-lg mb-10">
            Join hundreds of property owners who ditched spreadsheets for PropManager.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 bg-white text-blue-700 font-bold px-8 py-4 rounded-xl hover:bg-blue-50 transition-colors shadow-xl text-base group"
            >
              Get Started Free
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 bg-transparent border-2 border-white/50 hover:border-white text-white font-bold px-8 py-4 rounded-xl transition-colors text-base"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* ── LEGAL & HELP ── */}
      <section className="py-24 bg-gradient-to-b from-slate-50 to-blue-50/60 relative overflow-hidden">
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[700px] h-[220px] bg-blue-300/20 blur-3xl rounded-full pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 relative">
          <div className="text-center mb-12">
            <span className="text-sm font-semibold text-blue-700 uppercase tracking-widest">Trust & Transparency</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-3">Policy and Help Center</h2>
            <p className="text-slate-500 mt-3 max-w-2xl mx-auto">Everything important in one consistent experience, right inside the landing page.</p>
          </div>

          <article id="privacy-policy" className="scroll-mt-24 bg-white border border-blue-100 rounded-3xl p-6 sm:p-8 shadow-[0_12px_36px_rgba(37,99,235,0.10)]">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-5">Privacy Policy</h3>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                "We collect only account, lease, maintenance, and payment information required for secure platform operation.",
                "Your data is used for workflows, support, and reliability improvements, and is never sold to third parties.",
                "You can request access, correction, or deletion of your data by contacting PropManager support.",
              ].map((point) => (
                <div key={point} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                  <p className="text-slate-600 text-sm leading-relaxed">{point}</p>
                </div>
              ))}
            </div>
          </article>

          <article id="faq" className="scroll-mt-24 bg-white border border-indigo-100 rounded-3xl p-6 sm:p-8 shadow-[0_12px_36px_rgba(79,70,229,0.10)]">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-6">Frequently Asked Questions</h3>
            <div className="space-y-3">
              {FAQ_ITEMS.map((item, index) => {
                const isOpen = openFaqIndex === index;
                return (
                  <div key={item.q} className="rounded-2xl border border-slate-200 bg-white overflow-hidden transition-all duration-300">
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                      className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-4 text-left hover:bg-slate-50 transition-colors"
                    >
                      <span className="font-semibold text-slate-900">{item.q}</span>
                      <span className="shrink-0 w-8 h-8 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100">
                        {isOpen ? <Minus size={16} /> : <Plus size={16} />}
                      </span>
                    </button>
                    {isOpen && (
                      <div className="px-4 sm:px-5 pb-4 pt-1">
                        <p className="text-slate-600 text-sm leading-relaxed">{item.a}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </article>

          <article id="terms-and-conditions" className="scroll-mt-24 bg-white border border-sky-100 rounded-3xl p-6 sm:p-8 shadow-[0_12px_36px_rgba(14,165,233,0.10)]">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-5">Terms and Conditions</h3>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                "By using PropManager, you agree to provide accurate account and property information and use the platform lawfully.",
                "You are responsible for maintaining account credential security and activity performed under your account.",
                "Features may evolve for reliability and security, and misuse can result in restrictions or suspension.",
              ].map((point) => (
                <div key={point} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                  <p className="text-slate-600 text-sm leading-relaxed">{point}</p>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-slate-900 text-slate-400 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-600 rounded-lg">
              <Building2 size={16} className="text-white" />
            </div>
            <span className="text-white font-bold text-sm">PropManager</span>
          </div>
          <p className="text-sm text-slate-500">© {new Date().getFullYear()} PropManager. All rights reserved.</p>
          <div className="flex flex-wrap items-center justify-center gap-5 text-sm">
            <a href="#privacy-policy" className="hover:text-white transition-colors">
              Privacy Policy
            </a>
            <a href="#faq" className="hover:text-white transition-colors">
              Frequently Asked Questions
            </a>
            <a href="#terms-and-conditions" className="hover:text-white transition-colors">
              Terms and Conditions
            </a>
            <Link to="/login" className="hover:text-white transition-colors">Sign In</Link>
            <Link to="/register" className="hover:text-white transition-colors">Register</Link>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default LandingPage;
