import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Building2, Home, Users, DollarSign, Wrench, Shield,
  BarChart3, Bell, ChevronRight, ChevronLeft, Star, CheckCircle2,
  ArrowRight, Menu, X, MapPin, TrendingUp, Clock, Download,
  BriefcaseBusiness,
} from "lucide-react";
import { formatCurrencyCompact, formatCurrency } from "../utils/currency";
import api from "../utils/api";
import toast from "react-hot-toast";

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

const FEATURE_CARD_STYLES = [
  {
    shell: "border-blue-200 bg-gradient-to-br from-blue-50/70 to-white hover:shadow-[0_14px_36px_rgba(37,99,235,0.18)]",
    dot: "bg-blue-400/20",
  },
  {
    shell: "border-violet-200 bg-gradient-to-br from-violet-50/70 to-white hover:shadow-[0_14px_36px_rgba(124,58,237,0.18)]",
    dot: "bg-violet-400/20",
  },
  {
    shell: "border-emerald-200 bg-gradient-to-br from-emerald-50/70 to-white hover:shadow-[0_14px_36px_rgba(5,150,105,0.16)]",
    dot: "bg-emerald-400/20",
  },
  {
    shell: "border-amber-200 bg-gradient-to-br from-amber-50/80 to-white hover:shadow-[0_14px_36px_rgba(217,119,6,0.16)]",
    dot: "bg-amber-400/20",
  },
  {
    shell: "border-indigo-200 bg-gradient-to-br from-indigo-50/70 to-white hover:shadow-[0_14px_36px_rgba(79,70,229,0.18)]",
    dot: "bg-indigo-400/20",
  },
  {
    shell: "border-rose-200 bg-gradient-to-br from-rose-50/70 to-white hover:shadow-[0_14px_36px_rgba(225,29,72,0.16)]",
    dot: "bg-rose-400/20",
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

const HERO_HIGHLIGHTS = [
  {
    icon: TrendingUp,
    title: "Revenue Visibility",
    desc: "Track rent collection, overdue trends and occupancy in one live panel.",
    metric: "98% On-time Collection",
  },
  {
    icon: Wrench,
    title: "Maintenance Automation",
    desc: "Resolve maintenance requests faster with status updates and comments.",
    metric: "3x Faster Resolution",
  },
  {
    icon: Users,
    title: "Tenant Lifecycle",
    desc: "Manage onboarding, leases and renewals without spreadsheets.",
    metric: "850+ Happy Tenants",
  },
];

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("pms_user") || "null");
  } catch {
    return null;
  }
};

const LandingPage = () => {
  const navigate = useNavigate();
  const [authUser, setAuthUser] = useState(() => getStoredUser());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [publicProperties, setPublicProperties] = useState([]);
  const [propertyLoading, setPropertyLoading] = useState(true);
  const [authPromptProperty, setAuthPromptProperty] = useState(null);
  const [submittingInquiryId, setSubmittingInquiryId] = useState("");
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [heroHighlightIndex, setHeroHighlightIndex] = useState(0);
  const [testimonialIndex, setTestimonialIndex] = useState(0);
  const carouselTimerRef = useRef(null);
  const heroTimerRef = useRef(null);
  const testimonialTimerRef = useRef(null);

  const VISIBLE = 3;

  const vacantProperties = publicProperties.filter((p) => p?.status === "Vacant");

  const startCarouselTimer = useCallback(() => {
    if (carouselTimerRef.current) clearInterval(carouselTimerRef.current);
    carouselTimerRef.current = setInterval(() => {
      setCarouselIndex((prev) => {
        const max = Math.max(0, vacantProperties.length - VISIBLE);
        return prev >= max ? 0 : prev + 1;
      });
    }, 3500);
  }, [vacantProperties.length]);

  useEffect(() => {
    if (vacantProperties.length > VISIBLE) {
      startCarouselTimer();
    }
    return () => { if (carouselTimerRef.current) clearInterval(carouselTimerRef.current); };
  }, [vacantProperties.length, startCarouselTimer]);

  useEffect(() => {
    if (heroTimerRef.current) clearInterval(heroTimerRef.current);
    heroTimerRef.current = setInterval(() => {
      setHeroHighlightIndex((prev) => (prev + 1) % HERO_HIGHLIGHTS.length);
    }, 2800);
    return () => {
      if (heroTimerRef.current) clearInterval(heroTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (testimonialTimerRef.current) clearInterval(testimonialTimerRef.current);
    testimonialTimerRef.current = setInterval(() => {
      setTestimonialIndex((prev) => (prev + 1) % TESTIMONIALS.length);
    }, 5000);
    return () => {
      if (testimonialTimerRef.current) clearInterval(testimonialTimerRef.current);
    };
  }, []);

  const carouselPrev = () => {
    setCarouselIndex((prev) => (prev <= 0 ? Math.max(0, vacantProperties.length - VISIBLE) : prev - 1));
    startCarouselTimer();
  };
  const carouselNext = () => {
    setCarouselIndex((prev) => {
      const max = Math.max(0, vacantProperties.length - VISIBLE);
      return prev >= max ? 0 : prev + 1;
    });
    startCarouselTimer();
  };

  const isLoggedIn = Boolean(authUser) && Boolean(localStorage.getItem("pms_token"));
  const dashboardPath = authUser?.role === "owner" ? "/owner/dashboard" : "/tenant/dashboard";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const syncAuthUser = () => setAuthUser(getStoredUser());
    window.addEventListener("storage", syncAuthUser);
    return () => window.removeEventListener("storage", syncAuthUser);
  }, []);

  useEffect(() => {
    const fetchPublicProperties = async () => {
      try {
        const { data } = await api.get("/properties/public");
        setPublicProperties(data?.properties || []);
      } catch {
        toast.error("Unable to load properties right now.");
      } finally {
        setPropertyLoading(false);
      }
    };

    fetchPublicProperties();
  }, []);

  const handleInterested = async (property) => {
    const token = localStorage.getItem("pms_token");
    let user = null;

    try {
      user = JSON.parse(localStorage.getItem("pms_user") || "null");
    } catch {
      user = null;
    }

    const pendingPayload = {
      propertyId: property._id,
      message: `I am interested in your ${property.propertyType} listing in ${property?.address?.city || "this area"}.`,
      savedAt: new Date().toISOString(),
    };

    if (!token || !user) {
      localStorage.setItem("pendingPropertyInquiry", JSON.stringify(pendingPayload));
      setAuthPromptProperty(property);
      return;
    }

    try {
      setSubmittingInquiryId(property._id);
      await api.post(`/properties/${property._id}/inquiries`, { message: pendingPayload.message });
      toast.success("Inquiry sent to property owner.");
    } catch (err) {
      const errorMessage = err?.response?.data?.message || "Unable to submit inquiry.";
      toast.error(errorMessage);
    } finally {
      setSubmittingInquiryId("");
    }
  };

  const handleDownloadFeatures = async () => {
    try {
      const response = await api.get("/features/download", { responseType: "blob" });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `property-management-features-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Features PDF downloaded successfully!");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Unable to download features PDF. Please try again.");
    }
  };

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
          <nav className="hidden md:flex items-center gap-1 rounded-2xl border border-blue-100/80 bg-white/85 px-2 py-1 shadow-[0_10px_28px_rgba(37,99,235,0.14)] backdrop-blur">
            <a href="#features" className="group relative rounded-xl px-3 py-2 text-sm font-bold text-slate-700 transition-all duration-200 hover:text-blue-700 hover:bg-blue-50">
              Features
              <span className="absolute inset-x-3 -bottom-0.5 h-0.5 scale-x-0 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-transform duration-200 group-hover:scale-x-100" />
            </a>
            <a href="#browse-properties" className="group relative rounded-xl px-3 py-2 text-sm font-bold text-slate-700 transition-all duration-200 hover:text-blue-700 hover:bg-blue-50">
              Browse Properties
              <span className="absolute inset-x-3 -bottom-0.5 h-0.5 scale-x-0 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-transform duration-200 group-hover:scale-x-100" />
            </a>
            <a href="#how-it-works" className="group relative rounded-xl px-3 py-2 text-sm font-bold text-slate-700 transition-all duration-200 hover:text-blue-700 hover:bg-blue-50">
              How it works
              <span className="absolute inset-x-3 -bottom-0.5 h-0.5 scale-x-0 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-transform duration-200 group-hover:scale-x-100" />
            </a>
            <a href="#testimonials" className="group relative rounded-xl px-3 py-2 text-sm font-bold text-slate-700 transition-all duration-200 hover:text-blue-700 hover:bg-blue-50">
              Reviews
              <span className="absolute inset-x-3 -bottom-0.5 h-0.5 scale-x-0 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-transform duration-200 group-hover:scale-x-100" />
            </a>
            <a href="#vendor-program" className="group relative rounded-xl px-3 py-2 text-sm font-bold text-slate-700 transition-all duration-200 hover:text-blue-700 hover:bg-blue-50">
              Vendor Program
              <span className="absolute inset-x-3 -bottom-0.5 h-0.5 scale-x-0 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-transform duration-200 group-hover:scale-x-100" />
            </a>
          </nav>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            {isLoggedIn ? (
              <button
                type="button"
                onClick={() => navigate(dashboardPath)}
                className="text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm inline-flex items-center gap-1.5"
              >
                <Home size={14} /> Dashboard
              </button>
            ) : (
              <>
                <Link to="/login" className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors px-3 py-2">
                  Sign In
                </Link>
                <Link to="/register" className="text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm">
                  Get Started Free
                </Link>
              </>
            )}
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
            <a href="#browse-properties" onClick={() => setMobileMenuOpen(false)} className="block text-sm font-medium text-gray-700 py-2">Browse Properties</a>
            <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="block text-sm font-medium text-gray-700 py-2">How it works</a>
            <a href="#testimonials" onClick={() => setMobileMenuOpen(false)} className="block text-sm font-medium text-gray-700 py-2">Reviews</a>
            <a href="#vendor-program" onClick={() => setMobileMenuOpen(false)} className="block text-sm font-medium text-gray-700 py-2">Vendor Program</a>
            <div className="flex gap-3 pt-2">
              {isLoggedIn ? (
                <button
                  type="button"
                  onClick={() => {
                    navigate(dashboardPath);
                    setMobileMenuOpen(false);
                  }}
                  className="flex-1 text-center bg-blue-600 text-sm font-semibold text-white py-2 rounded-lg inline-flex items-center justify-center gap-1.5"
                >
                  <Home size={14} /> Dashboard
                </button>
              ) : (
                <>
                  <Link to="/login" className="flex-1 text-center border border-gray-200 text-sm font-medium text-gray-700 py-2 rounded-lg">Sign In</Link>
                  <Link to="/register" className="flex-1 text-center bg-blue-600 text-sm font-semibold text-white py-2 rounded-lg">Get Started</Link>
                </>
              )}
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

            <div className="mt-8 rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-md max-w-xl">
              <div className="flex items-start gap-3">
                {(() => {
                  const ActiveIcon = HERO_HIGHLIGHTS[heroHighlightIndex].icon;
                  return (
                    <div className="rounded-xl bg-white/15 p-2.5 text-cyan-200">
                      <ActiveIcon size={18} />
                    </div>
                  );
                })()}
                <div className="min-h-[68px]">
                  <p className="text-sm font-bold text-white">{HERO_HIGHLIGHTS[heroHighlightIndex].title}</p>
                  <p className="text-xs text-blue-100 mt-1 leading-relaxed">{HERO_HIGHLIGHTS[heroHighlightIndex].desc}</p>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-cyan-200 mt-2">
                    {HERO_HIGHLIGHTS[heroHighlightIndex].metric}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex gap-1.5">
                {HERO_HIGHLIGHTS.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setHeroHighlightIndex(idx)}
                    className={`h-1.5 rounded-full transition-all ${idx === heroHighlightIndex ? "w-7 bg-cyan-300" : "w-2 bg-white/35"}`}
                    aria-label={`Hero highlight ${idx + 1}`}
                  />
                ))}
              </div>
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

      {/* ── BROWSE PROPERTIES CAROUSEL ── */}
      <section id="browse-properties" className="py-24 bg-gradient-to-b from-white to-blue-50/60 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <span className="text-sm font-semibold text-blue-600 uppercase tracking-widest">Find your next place</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mt-2">Vacant Properties</h2>
              <p className="text-gray-500 mt-2 max-w-xl text-base">
                Owner-listed vacant properties, updated in real time. Browse below or explore the full catalogue.
              </p>
            </div>
            <Link
              to="/properties"
              className="shrink-0 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors shadow-md shadow-blue-200 group"
            >
              View All Properties
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {propertyLoading ? (
            <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-gray-500">Loading properties...</div>
          ) : vacantProperties.length === 0 ? (
            <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-gray-500">No vacant properties listed right now.</div>
          ) : (
            <div className="relative">
              <div className="overflow-hidden rounded-2xl">
                <div
                  className="flex transition-transform duration-700 ease-in-out gap-5"
                  style={{ transform: `translateX(calc(-${carouselIndex * (100 / VISIBLE)}% - ${carouselIndex * (20 / VISIBLE)}px))` }}
                >
                  {vacantProperties.map((property) => (
                    <div
                      key={property._id}
                      className="rounded-2xl border border-gray-100 bg-white overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex-shrink-0"
                      style={{ width: `calc(${100 / VISIBLE}% - ${(20 * (VISIBLE - 1)) / VISIBLE}px)` }}
                    >
                      <div className="relative overflow-hidden">
                        <img
                          src={
                            property.propertyType === "Flat"
                              ? "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&q=80"
                              : property.propertyType === "Office"
                              ? "https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&q=80"
                              : property.propertyType === "Shop"
                              ? "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=600&q=80"
                              : property.propertyType === "Villa"
                              ? "https://images.unsplash.com/photo-1613977257363-707ba9348227?w=600&q=80"
                              : property.propertyType === "House"
                              ? "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=600&q=80"
                              : "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&q=80"
                          }
                          alt={property.propertyType}
                          className="w-full h-44 object-cover hover:scale-105 transition-transform duration-500"
                        />
                        <span className="absolute top-3 left-3 text-[11px] font-bold uppercase tracking-wider bg-white/90 backdrop-blur-sm text-blue-700 px-2.5 py-1 rounded-lg shadow-sm">
                          {property.propertyType}
                        </span>
                        <span className="absolute top-3 right-3 text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-emerald-200 bg-emerald-50/90 backdrop-blur-sm text-emerald-700">
                          Vacant
                        </span>
                      </div>
                      <div className="p-5">
                        <h3 className="text-base font-bold text-gray-900">
                          {property?.address?.city || "Unknown city"}, {property?.address?.state || ""}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                          {property?.description || "No description provided by owner yet."}
                        </p>
                        <div className="mt-3 space-y-1 text-xs text-gray-500">
                          <p className="flex items-center gap-1.5"><MapPin size={12} className="text-blue-400" />{property?.address?.street || "Address not available"}</p>
                          <p>Rooms: <span className="font-semibold text-gray-700">{property.numberOfRooms || 1}</span> &nbsp;|&nbsp; Listed by: <span className="font-semibold text-gray-700">{property?.owner?.name || "Owner"}</span></p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleInterested(property)}
                          disabled={submittingInquiryId === property._id}
                          className="mt-4 w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl px-4 py-2.5 transition-colors disabled:opacity-60"
                        >
                          {submittingInquiryId === property._id ? "Submitting..." : "I'm Interested"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {vacantProperties.length > VISIBLE && (
                <>
                  <button
                    type="button"
                    onClick={carouselPrev}
                    className="absolute -left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:text-blue-600 hover:border-blue-300 transition-colors z-10"
                    aria-label="Previous"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    type="button"
                    onClick={carouselNext}
                    className="absolute -right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:text-blue-600 hover:border-blue-300 transition-colors z-10"
                    aria-label="Next"
                  >
                    <ChevronRight size={20} />
                  </button>
                </>
              )}

              {vacantProperties.length > VISIBLE && (
                <div className="flex justify-center gap-1.5 mt-6">
                  {Array.from({ length: Math.max(0, vacantProperties.length - VISIBLE) + 1 }).map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setCarouselIndex(i);
                        startCarouselTimer();
                      }}
                      className={`h-2 rounded-full transition-all duration-300 ${i === carouselIndex ? "w-6 bg-blue-600" : "w-2 bg-gray-300 hover:bg-blue-300"}`}
                      aria-label={`Go to slide ${i + 1}`}
                    />
                  ))}
                </div>
              )}

              <div className="text-center mt-10">
                <Link
                  to="/properties"
                  className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-semibold text-sm border border-blue-200 hover:border-blue-400 bg-blue-50 hover:bg-blue-100 px-6 py-3 rounded-xl transition-all group"
                >
                  Explore all {vacantProperties.length > 0 ? `${vacantProperties.length} ` : ""}vacant properties
                  <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── VENDOR PROGRAM CTA ── */}
      <section id="vendor-program" className="py-20 bg-gradient-to-b from-white to-indigo-50/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 text-white p-7 sm:p-8 shadow-xl">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-indigo-200 font-semibold">
                  <BriefcaseBusiness size={13} /> Vendor Partnership Program
                </p>
                <h2 className="mt-3 text-3xl font-extrabold leading-tight">Are you a service vendor? Join the PropManager network.</h2>
                <p className="mt-3 text-sm text-blue-100 max-w-2xl">
                  We work with trusted electricians, plumbers, painters, carpenters, and facility teams. Submit your profile and start your vendor journey with us.
                </p>
                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  {[
                    "Consistent service leads",
                    "Direct owner coordination",
                    "Fast assignment workflow",
                    "Long-term partnership growth",
                  ].map((point) => (
                    <p key={point} className="inline-flex items-center gap-2 text-blue-100">
                      <CheckCircle2 size={14} className="text-emerald-300" /> {point}
                    </p>
                  ))}
                </div>
              </div>

              <div className="shrink-0">
                <Link
                  to="/vendor-onboarding"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white text-indigo-700 font-bold px-6 py-3.5 hover:bg-indigo-50 transition-colors shadow-lg"
                >
                  Start Vendor Journey
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-24 bg-gradient-to-b from-white via-sky-50/50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-sm font-semibold text-blue-600 uppercase tracking-widest">Everything you need</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mt-3">
              Built for Property Owners &amp; Tenants
            </h2>
            <p className="text-gray-500 mt-4 max-w-xl mx-auto text-lg">
              Every feature was designed to reduce back-and-forth and give both owners and tenants full transparency.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
            <div className="relative overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 p-6 text-white shadow-[0_14px_30px_rgba(37,99,235,0.28)]">
              <div className="absolute -top-10 -right-10 h-28 w-28 rounded-full bg-white/10" />
              <div className="relative">
                <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-100">
                  <Building2 size={14} /> For Owners
                </p>
                <h3 className="mt-2 text-2xl font-extrabold">Operate Like a Pro</h3>
                <p className="mt-2 text-sm text-blue-100 max-w-md">
                  Keep occupancy high, collect rent on time, and close leads faster with one command center.
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold">
                  <span className="rounded-full border border-white/25 bg-white/10 px-2.5 py-1">Lead Tracking</span>
                  <span className="rounded-full border border-white/25 bg-white/10 px-2.5 py-1">Automated Rent Flow</span>
                  <span className="rounded-full border border-white/25 bg-white/10 px-2.5 py-1">Vacancy Visibility</span>
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 text-white shadow-[0_14px_30px_rgba(15,23,42,0.28)]">
              <div className="absolute -bottom-10 -left-10 h-28 w-28 rounded-full bg-white/5" />
              <div className="relative">
                <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
                  <Users size={14} /> For Tenants
                </p>
                <h3 className="mt-2 text-2xl font-extrabold">Live With Clarity</h3>
                <p className="mt-2 text-sm text-slate-200 max-w-md">
                  Track dues, raise requests, and manage lease updates without uncertainty or follow-up friction.
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold">
                  <span className="rounded-full border border-white/20 bg-white/5 px-2.5 py-1">Transparent Payments</span>
                  <span className="rounded-full border border-white/20 bg-white/5 px-2.5 py-1">Faster Support</span>
                  <span className="rounded-full border border-white/20 bg-white/5 px-2.5 py-1">Lease Timeline</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, idx) => {
              const tone = FEATURE_CARD_STYLES[idx % FEATURE_CARD_STYLES.length];
              return (
              <div key={f.title} className={`group relative overflow-hidden p-6 rounded-2xl border transition-all duration-300 cursor-default ${tone.shell}`}>
                <div className={`absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-70 group-hover:opacity-100 transition-opacity duration-300 ${tone.dot}`} />
                <div className={`relative w-12 h-12 rounded-2xl flex items-center justify-center ${f.color} mb-4 group-hover:scale-110 transition-transform duration-300 shadow-sm`}>
                  <f.icon size={22} />
                </div>
                <h3 className="relative font-bold text-gray-900 text-lg mb-2">{f.title}</h3>
                <p className="relative text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            );})}
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
            <div className="hidden lg:block absolute top-10 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-blue-100 via-blue-400 to-blue-100" />

            {HOW_IT_WORKS.map((s) => (
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

          <div className="max-w-4xl mx-auto">
            <div className="relative bg-white rounded-3xl p-8 border border-gray-100 shadow-[0_18px_40px_rgba(30,64,175,0.12)] overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.08),transparent_45%)]" />
              <div className="relative">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: TESTIMONIALS[testimonialIndex].stars }).map((_, i) => (
                      <Star key={i} size={16} className="fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <div className="text-5xl font-serif text-blue-100 leading-none select-none">&ldquo;</div>
                </div>

                <p className="text-gray-700 text-base sm:text-lg leading-relaxed min-h-[86px] transition-all duration-500">
                  {TESTIMONIALS[testimonialIndex].text}
                </p>

                <div className="mt-6 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                      {TESTIMONIALS[testimonialIndex].avatar}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{TESTIMONIALS[testimonialIndex].name}</p>
                      <p className="text-gray-500 text-xs">{TESTIMONIALS[testimonialIndex].role}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setTestimonialIndex((prev) => (prev <= 0 ? TESTIMONIALS.length - 1 : prev - 1))}
                      className="w-9 h-9 rounded-full border border-gray-200 bg-white text-gray-600 hover:text-blue-600 hover:border-blue-300 flex items-center justify-center"
                      aria-label="Previous testimonial"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setTestimonialIndex((prev) => (prev + 1) % TESTIMONIALS.length)}
                      className="w-9 h-9 rounded-full border border-gray-200 bg-white text-gray-600 hover:text-blue-600 hover:border-blue-300 flex items-center justify-center"
                      aria-label="Next testimonial"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>

                <div className="mt-5 flex justify-center gap-1.5">
                  {TESTIMONIALS.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setTestimonialIndex(i)}
                      className={`h-1.5 rounded-full transition-all duration-300 ${i === testimonialIndex ? "w-7 bg-blue-600" : "w-2 bg-gray-300 hover:bg-blue-300"}`}
                      aria-label={`Go to testimonial ${i + 1}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {TESTIMONIALS.map((item, i) => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => setTestimonialIndex(i)}
                  className={`text-left rounded-xl border p-3 transition-all ${
                    i === testimonialIndex
                      ? "border-blue-300 bg-blue-50 shadow-sm"
                      : "border-gray-200 bg-white hover:border-blue-200"
                  }`}
                >
                  <p className="text-xs font-semibold text-gray-900 truncate">{item.name}</p>
                  <p className="text-[11px] text-gray-500 truncate">{item.role}</p>
                </button>
              ))}
            </div>
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
            <button
              onClick={handleDownloadFeatures}
              className="inline-flex items-center justify-center gap-2 bg-blue-600 border-2 border-white/30 hover:bg-blue-700 hover:border-white text-white font-bold px-8 py-4 rounded-xl transition-colors text-base group"
            >
              Download Features PDF
              <Download size={18} className="group-hover:scale-110 transition-transform" />
            </button>
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 bg-transparent border-2 border-white/50 hover:border-white text-white font-bold px-8 py-4 rounded-xl transition-colors text-base"
            >
              Sign In
            </Link>
          </div>
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
            <button onClick={handleDownloadFeatures} className="hover:text-white transition-colors cursor-pointer bg-none border-none p-0">
              Download Features
            </button>
            <Link to="/privacy-policy" className="hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link to="/faq" className="hover:text-white transition-colors">
              FAQ
            </Link>
            <Link to="/terms-and-conditions" className="hover:text-white transition-colors">
              Terms & Conditions
            </Link>
            <a href="#vendor-program" className="hover:text-white transition-colors">Vendor Program</a>
            {!isLoggedIn && (
              <>
                <Link to="/login" className="hover:text-white transition-colors">Sign In</Link>
                <Link to="/register" className="hover:text-white transition-colors">Register</Link>
              </>
            )}
          </div>
        </div>
      </footer>

      {authPromptProperty && (
        <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/20 bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900">Login or Sign Up Required</h3>
            <p className="text-sm text-gray-600 mt-2">
              To continue, sign in or create an account. We will submit your inquiry for {authPromptProperty.propertyType} in {authPromptProperty?.address?.city || "this location"} after authentication.
            </p>
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  navigate("/login");
                  setAuthPromptProperty(null);
                }}
                className="rounded-xl bg-blue-600 text-white font-semibold px-4 py-2.5 hover:bg-blue-700"
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => {
                  navigate("/register");
                  setAuthPromptProperty(null);
                }}
                className="rounded-xl border border-gray-200 text-gray-800 font-semibold px-4 py-2.5 hover:bg-gray-50"
              >
                Sign Up
              </button>
            </div>
            <button
              type="button"
              onClick={() => setAuthPromptProperty(null)}
              className="mt-3 w-full text-sm text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default LandingPage;
