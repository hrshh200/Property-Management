import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  BriefcaseBusiness,
  CheckCircle2,
  ArrowLeft,
  Send,
  Mail,
  Phone,
  MapPin,
  User,
  Zap,
  Shield,
  TrendingUp,
  Star,
  Users,
  Clock,
} from "lucide-react";
import api from "../utils/api";
import toast from "react-hot-toast";

const SPECIALIZATIONS = ["Electric", "Plumbing", "General", "Carpentry", "Painting", "Other"];

const BENEFITS = [
  { icon: Zap, title: "Instant Ticket Alerts", desc: "Get notified the moment a relevant maintenance request is raised." },
  { icon: Shield, title: "Verified Platform", desc: "Your profile is verified and shown only to property owners we trust." },
  { icon: TrendingUp, title: "Grow Your Business", desc: "Access a consistent pipeline of work across our property network." },
  { icon: Users, title: "Owner Direct Coordination", desc: "Connect directly with property owners — no middlemen, no delays." },
];

const STATS = [
  { value: "500+", label: "Properties Served" },
  { value: "1-2 Days", label: "Avg. Onboarding Time" },
  { value: "98%", label: "Vendor Satisfaction" },
];

const emptyForm = {
  companyName: "",
  contactName: "",
  email: "",
  phone: "",
  city: "",
  specializations: ["General"],
  message: "",
};

const VendorOnboarding = () => {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/vendors/contact", form);
      setSubmitted(true);
      setForm(emptyForm);
    } catch (err) {
      toast.error(err.response?.data?.message || "Unable to submit request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* ── Navbar ────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-20 border-b border-white/60 bg-white/70 backdrop-blur-md shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-700 hover:text-indigo-900 transition-colors">
            <ArrowLeft size={15} /> Back to Home
          </Link>
          <div className="flex items-center gap-2 text-gray-800">
            <div className="p-1.5 rounded-lg bg-indigo-600 text-white"><Building2 size={15} /></div>
            <span className="font-extrabold text-sm hidden sm:inline">PropManager</span>
          </div>
        </div>
      </nav>

      {/* ── Hero Section ──────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 py-16 lg:py-20">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-white/5" />
          <div className="absolute -bottom-16 -left-16 w-72 h-72 rounded-full bg-white/5" />
          <div className="absolute top-1/3 left-1/2 w-40 h-40 rounded-full bg-indigo-400/10" />
        </div>
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-4 py-1.5 text-xs font-semibold text-indigo-200 uppercase tracking-wider mb-5">
            <BriefcaseBusiness size={12} /> Vendor Partnership Program
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight">
            Grow Your Service Business<br className="hidden sm:block" />
            <span className="text-indigo-300"> with PropManager</span>
          </h1>
          <p className="mt-5 text-base text-blue-200 max-w-2xl mx-auto leading-relaxed">
            Join our trusted vendor network and get consistent maintenance service opportunities from property owners across your city.
          </p>
          {/* Stats row */}
          <div className="mt-10 inline-flex flex-wrap justify-center gap-4 sm:gap-8">
            {STATS.map(({ value, label }) => (
              <div key={label} className="text-center">
                <p className="text-2xl font-extrabold text-white">{value}</p>
                <p className="text-xs text-indigo-300 mt-0.5 font-medium">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Main Content ──────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12 items-start">

          {/* Left — Benefits + Social Proof */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h2 className="text-xl font-extrabold text-gray-900">Why partner with us?</h2>
              <p className="mt-1 text-sm text-gray-500">Everything you need to build a steady, growing service business.</p>
            </div>

            <div className="space-y-4">
              {BENEFITS.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                    <Icon size={18} className="text-indigo-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Trust card */}
            <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-700 p-5 text-white shadow-lg">
              <div className="flex items-center gap-2 mb-3">
                <Star size={16} className="text-yellow-300 fill-yellow-300" />
                <Star size={16} className="text-yellow-300 fill-yellow-300" />
                <Star size={16} className="text-yellow-300 fill-yellow-300" />
                <Star size={16} className="text-yellow-300 fill-yellow-300" />
                <Star size={16} className="text-yellow-300 fill-yellow-300" />
                <span className="text-xs text-indigo-200 ml-1 font-medium">Top-rated vendors</span>
              </div>
              <p className="text-sm text-indigo-100 leading-relaxed italic">
                "Joining PropManager doubled our monthly service orders. The ticket system is seamless."
              </p>
              <p className="mt-2 text-xs text-indigo-300 font-semibold">— Verified partner vendor</p>
            </div>

            <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 space-y-2 text-xs text-indigo-800">
              <p className="inline-flex items-center gap-2 font-semibold text-sm text-indigo-900"><Clock size={14} /> Response time</p>
              <p className="text-indigo-700">Our team reviews all applications within <strong>1-2 business days</strong>. Keep your phone reachable for a verification call.</p>
            </div>
          </div>

          {/* Right — Form */}
          <div className="lg:col-span-3">
            {submitted ? (
              <div className="rounded-3xl border border-emerald-200 bg-white shadow-lg p-10 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto">
                  <CheckCircle2 size={32} className="text-emerald-600" />
                </div>
                <h3 className="text-xl font-extrabold text-gray-900">Application Submitted!</h3>
                <p className="text-sm text-gray-500 max-w-sm mx-auto leading-relaxed">
                  Thanks for your interest! Our team will review your application and reach out within 1-2 business days.
                </p>
                <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    type="button"
                    onClick={() => setSubmitted(false)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-sm px-5 py-2.5"
                  >
                    Submit Another
                  </button>
                  <Link
                    to="/"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm px-5 py-2.5"
                  >
                    Back to Home
                  </Link>
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border border-gray-200 bg-white shadow-lg overflow-hidden">
                {/* Form header */}
                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-gray-100 px-6 py-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow">
                      <BriefcaseBusiness size={18} />
                    </div>
                    <div>
                      <h2 className="text-lg font-extrabold text-gray-900">Vendor Onboarding Request</h2>
                      <p className="text-xs text-gray-500 mt-0.5">Fill in your business details to get started.</p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                  {/* Company & Contact */}
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-3">Business Information</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-gray-500 block mb-1">Company Name *</label>
                        <div className="relative">
                          <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            required
                            className="input-field pl-8"
                            placeholder="e.g. ABC Electricals"
                            value={form.companyName}
                            onChange={(e) => setForm((prev) => ({ ...prev, companyName: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-500 block mb-1">Contact Person *</label>
                        <div className="relative">
                          <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            required
                            className="input-field pl-8"
                            placeholder="Full name"
                            value={form.contactName}
                            onChange={(e) => setForm((prev) => ({ ...prev, contactName: e.target.value }))}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-3">Contact Details</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-gray-500 block mb-1">Business Email *</label>
                        <div className="relative">
                          <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            required
                            type="email"
                            className="input-field pl-8"
                            placeholder="you@company.com"
                            value={form.email}
                            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-500 block mb-1">Phone Number *</label>
                        <div className="relative">
                          <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            required
                            className="input-field pl-8"
                            placeholder="10-digit mobile"
                            value={form.phone}
                            onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="mt-3">
                      <label className="text-xs font-semibold text-gray-500 block mb-1">City</label>
                      <div className="relative">
                        <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          className="input-field pl-8"
                          placeholder="Operating city"
                          value={form.city}
                          onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Specializations */}
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-3">Service Specializations</p>
                    <div className="flex flex-wrap gap-2">
                      {SPECIALIZATIONS.map((item) => {
                        const active = form.specializations.includes(item);
                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={() =>
                              setForm((prev) => {
                                const next = prev.specializations.includes(item)
                                  ? prev.specializations.filter((x) => x !== item)
                                  : [...prev.specializations, item];
                                return { ...prev, specializations: next.length ? next : ["General"] };
                              })
                            }
                            className={`px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all ${
                              active
                                ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                                : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600"
                            }`}
                          >
                            {item}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Message */}
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1">Tell us about your services</label>
                    <textarea
                      rows={4}
                      className="input-field"
                      placeholder="Describe your team size, service coverage area, typical response time, and any specialisations…"
                      value={form.message}
                      onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-4 py-3 disabled:opacity-60 shadow-lg shadow-indigo-200 transition-all"
                  >
                    <Send size={15} /> {submitting ? "Submitting…" : "Submit Application"}
                  </button>

                  <p className="text-center text-xs text-gray-400">
                    By submitting you agree to our vendor partnership terms. We'll never share your data without consent.
                  </p>
                </form>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default VendorOnboarding;
