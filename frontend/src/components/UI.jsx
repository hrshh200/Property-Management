import React, { useState, useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, Images } from "lucide-react";

/* ─────────────────────────────────────────────
   PROPERTY IMAGE CAROUSEL
   Props:
     photoUrls   – array of raw paths/URLs from DB
     propertyType – string ("Home"|"Flat" etc.) for fallback
     apiOrigin   – backend origin string (e.g. "http://localhost:5000")
     height      – Tailwind h-* class (default "h-48")
     autoInterval – ms between slides (default 3500)
───────────────────────────────────────────── */
// Multiple curated static images per property type so the carousel
// animates even when no photos have been uploaded.
const FALLBACK_IMAGES = {
  Flat: [
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=900&q=80", // modern flat interior
    "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=900&q=80", // bright apartment living room
    "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=900&q=80",  // cosy flat with balcony
    "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=900&q=80", // open plan flat kitchen
  ],
  Office: [
    "https://images.unsplash.com/photo-1497366216548-37526070297c?w=900&q=80", // open office space
    "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=900&q=80", // modern office lobby
    "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=900&q=80", // glass-walled office
    "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=900&q=80", // co-working space
  ],
  Shop: [
    "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=900&q=80", // retail storefront
    "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=900&q=80", // shopping interior
    "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=900&q=80", // boutique shop interior
    "https://images.unsplash.com/photo-1534452203293-494d7ddbf7e0?w=900&q=80", // commercial shopfront
  ],
  Home: [
    "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=900&q=80", // suburban home exterior
    "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=900&q=80", // modern home front
    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=900&q=80", // luxury home with pool
    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=900&q=80", // cosy home living room
  ],
  Villa: [
    "https://images.unsplash.com/photo-1613977257363-707ba9348227?w=900&q=80", // villa exterior
    "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=900&q=80", // luxury villa pool
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=900&q=80", // modern villa facade
    "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=900&q=80", // villa with garden
  ],
  House: [
    "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=900&q=80", // classic house
    "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=900&q=80", // house with driveway
    "https://images.unsplash.com/photo-1576941089067-2de3c901e126?w=900&q=80", // house with porch
    "https://images.unsplash.com/photo-1523217582562-09d0def993a6?w=900&q=80", // house interior hallway
  ],
};

const DEFAULT_FALLBACKS = [
  "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=900&q=80",
  "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=900&q=80",
  "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?w=900&q=80",
];

const resolveUrl = (src, apiOrigin) => {
  if (!src) return "";
  if (src.startsWith("http")) return src;
  return `${apiOrigin}${src}`;
};

export const PropertyImageCarousel = ({
  photoUrls = [],
  propertyType = "",
  apiOrigin = "",
  height = "h-48",
  autoInterval = 3500,
}) => {
  const resolvedPhotos = photoUrls.length > 0
    ? photoUrls.map((u) => resolveUrl(u, apiOrigin))
    : (FALLBACK_IMAGES[propertyType] || DEFAULT_FALLBACKS);

  const total = resolvedPhotos.length;
  const [active, setActive] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [direction, setDirection] = useState("next"); // "next" | "prev"

  const goTo = useCallback((idx, dir = "next") => {
    if (total <= 1 || animating) return;
    setDirection(dir);
    setAnimating(true);
    setTimeout(() => {
      setActive(idx);
      setAnimating(false);
    }, 350);
  }, [total, animating]);

  const next = useCallback(() => goTo((active + 1) % total, "next"), [active, total, goTo]);
  const prev = useCallback(() => goTo((active - 1 + total) % total, "prev"), [active, total, goTo]);

  // Auto-advance
  useEffect(() => {
    if (total <= 1) return;
    const id = setInterval(next, autoInterval);
    return () => clearInterval(id);
  }, [total, next, autoInterval]);

  const slideClass = animating
    ? direction === "next"
      ? "translate-x-full opacity-0"
      : "-translate-x-full opacity-0"
    : "translate-x-0 opacity-100";

  return (
    <div className={`relative ${height} w-full overflow-hidden select-none bg-gray-100`}>
      {/* Slide image */}
      <img
        key={active}
        src={resolvedPhotos[active]}
        alt={`Property ${active + 1}`}
        className={`absolute inset-0 h-full w-full object-cover transition-all duration-350 ease-in-out ${slideClass}`}
        loading="lazy"
        onError={(e) => {
          e.currentTarget.src = FALLBACK_IMAGES[propertyType] ||
            "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=900&q=80";
        }}
      />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

      {/* Photo count badge */}
      {total > 1 && (
        <div className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
          <Images size={10} />
          {active + 1}/{total}
        </div>
      )}

      {/* Prev / Next arrows — visible on hover */}
      {total > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-1.5 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-black/45 text-white opacity-0 group-hover:opacity-100 hover:bg-black/70 transition-all duration-200 backdrop-blur-sm"
            aria-label="Previous photo"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-black/45 text-white opacity-0 group-hover:opacity-100 hover:bg-black/70 transition-all duration-200 backdrop-blur-sm"
            aria-label="Next photo"
          >
            <ChevronRight size={14} />
          </button>
        </>
      )}

      {/* Dot indicators */}
      {total > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
          {resolvedPhotos.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={(e) => { e.stopPropagation(); goTo(i, i > active ? "next" : "prev"); }}
              className={`rounded-full transition-all duration-250 ${
                i === active
                  ? "w-4 h-1.5 bg-white"
                  : "w-1.5 h-1.5 bg-white/55 hover:bg-white/80"
              }`}
              aria-label={`Photo ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────
   STAT CARD
───────────────────────────────────────────── */
export const StatCard = ({ title, value, icon: Icon, color = "blue", subtitle }) => {
  const colorMap = {
    blue:   { grad: "from-blue-500 to-indigo-600",   shadow: "shadow-blue-200",   ring: "ring-blue-100",   text: "text-blue-700",   bg: "bg-blue-50" },
    green:  { grad: "from-emerald-500 to-teal-600",  shadow: "shadow-emerald-200", ring: "ring-emerald-100", text: "text-emerald-700", bg: "bg-emerald-50" },
    red:    { grad: "from-red-500 to-rose-600",      shadow: "shadow-red-200",     ring: "ring-red-100",     text: "text-red-700",     bg: "bg-red-50" },
    yellow: { grad: "from-amber-400 to-orange-500",  shadow: "shadow-amber-200",   ring: "ring-amber-100",   text: "text-amber-700",   bg: "bg-amber-50" },
    purple: { grad: "from-purple-500 to-violet-600", shadow: "shadow-purple-200",  ring: "ring-purple-100",  text: "text-purple-700",  bg: "bg-purple-50" },
    gray:   { grad: "from-gray-400 to-slate-500",    shadow: "shadow-gray-200",    ring: "ring-gray-100",    text: "text-gray-600",    bg: "bg-gray-50" },
  };
  const c = colorMap[color] || colorMap.blue;
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4
        shadow-[0_2px_16px_rgba(0,0,0,0.06)] hover:shadow-[0_6px_28px_rgba(0,0,0,0.10)]
        transition-all duration-250 group ring-1 ${c.ring}`}>
      <div className={`p-3.5 rounded-2xl bg-gradient-to-br ${c.grad} shadow-lg ${c.shadow}
          group-hover:scale-110 group-hover:rotate-3 transition-all duration-250 shrink-0`}>
        <Icon size={22} className="text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{title}</p>
        <p className={`text-2xl font-extrabold mt-0.5 ${c.text}`}>{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5 leading-snug">{subtitle}</p>}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   STATUS BADGE
───────────────────────────────────────────── */
const STATUS_MAP = {
  Paid:          { cls: "badge-green",  dot: "bg-emerald-500" },
  Pending:       { cls: "badge-yellow", dot: "bg-amber-400" },
  Overdue:       { cls: "badge-red",    dot: "bg-red-500" },
  Open:          { cls: "badge-red",    dot: "bg-red-500" },
  "In Progress": { cls: "badge-yellow", dot: "bg-amber-400" },
  Resolved:      { cls: "badge-green",  dot: "bg-emerald-500" },
  Occupied:      { cls: "badge-blue",   dot: "bg-blue-500" },
  Vacant:        { cls: "badge-gray",   dot: "bg-gray-400" },
  Active:        { cls: "badge-green",  dot: "bg-emerald-500" },
  Inactive:      { cls: "badge-gray",   dot: "bg-gray-400" },
  Approved:      { cls: "badge-green",  dot: "bg-emerald-500" },
  Rejected:      { cls: "badge-red",    dot: "bg-red-500" },
  Completed:     { cls: "badge-blue",   dot: "bg-blue-500" },
  Cancelled:     { cls: "badge-gray",   dot: "bg-gray-400" },
  Accepted:      { cls: "badge-green",  dot: "bg-emerald-500" },
  New:           { cls: "badge-purple", dot: "bg-purple-500" },
  Contacted:     { cls: "badge-blue",   dot: "bg-blue-500" },
  "Visit Planned": { cls: "badge-purple", dot: "bg-violet-500" },
  Visited:       { cls: "badge-blue",   dot: "bg-cyan-500" },
  Handled:       { cls: "badge-green",  dot: "bg-emerald-500" },
  Closed:        { cls: "badge-gray",   dot: "bg-gray-400" },
};

export const StatusBadge = ({ status }) => {
  const { cls, dot } = STATUS_MAP[status] || { cls: "badge-gray", dot: "bg-gray-400" };
  return (
    <span className={`${cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot} shrink-0`} />
      {status}
    </span>
  );
};

/* ─────────────────────────────────────────────
   PAGE HEADER
───────────────────────────────────────────── */
export const PageHeader = ({ title, subtitle, action }) => (
  <div className="flex items-start justify-between mb-7 gap-4">
    <div>
      <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight leading-tight">{title}</h1>
      {subtitle && <p className="text-gray-500 text-sm mt-1.5 leading-relaxed max-w-xl">{subtitle}</p>}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);

/* ─────────────────────────────────────────────
   MODAL
───────────────────────────────────────────── */
export const Modal = ({ isOpen, onClose, title, children, size = "md", maxWidth }) => {
  if (!isOpen) return null;
  const widthMap = {
    sm: "max-w-sm",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-3xl",
    "2xl": "max-w-4xl",
    "3xl": "max-w-5xl",
    "4xl": "max-w-6xl",
    "5xl": "max-w-7xl",
    full: "max-w-[96vw]",
  };
  const modalWidth = maxWidth
    ? (String(maxWidth).startsWith("max-w-") ? String(maxWidth) : `max-w-${maxWidth}`)
    : (widthMap[size] || widthMap.md);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-overlay-in"
      style={{ background: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
        <div className={`bg-white rounded-3xl shadow-2xl w-full ${modalWidth}
          max-h-[92vh] overflow-y-auto ring-1 ring-black/8 animate-modal-in`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100
            bg-gradient-to-r from-slate-50 to-white rounded-t-3xl sticky top-0 z-10">
          <h3 className="text-lg font-bold text-gray-900 leading-tight">{title}</h3>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full
                bg-gray-100 hover:bg-red-50 text-gray-400 hover:text-red-500
                transition-all duration-200 hover:scale-110 active:scale-95"
            aria-label="Close"
          >
            <X size={17} />
          </button>
        </div>
        {/* Body */}
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   EMPTY STATE
───────────────────────────────────────────── */
export const EmptyState = ({ message, icon: Icon, action }) => (
  <div className="flex flex-col items-center justify-center py-20 select-none">
    {Icon && (
      <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-gray-100 to-gray-50
          flex items-center justify-center mb-5 shadow-inner ring-1 ring-gray-200/80">
        <Icon size={40} className="text-gray-300" />
      </div>
    )}
    <p className="text-gray-600 text-base font-semibold">{message}</p>
    <p className="text-gray-400 text-sm mt-1.5">Nothing to display yet.</p>
    {action && <div className="mt-5">{action}</div>}
  </div>
);

/* ─────────────────────────────────────────────
   ALERT BANNER  (inline error / warning / info)
───────────────────────────────────────────── */
const ALERT_MAP = {
  error:   { wrap: "border-red-300 bg-red-50",     icon: "text-red-500",    title: "text-red-800",    body: "text-red-700" },
  warning: { wrap: "border-amber-300 bg-amber-50", icon: "text-amber-500",  title: "text-amber-800",  body: "text-amber-700" },
  success: { wrap: "border-emerald-300 bg-emerald-50", icon: "text-emerald-500", title: "text-emerald-800", body: "text-emerald-700" },
  info:    { wrap: "border-blue-300 bg-blue-50",   icon: "text-blue-500",   title: "text-blue-800",   body: "text-blue-700" },
};

export const Alert = ({ type = "error", title, message }) => {
  const s = ALERT_MAP[type] || ALERT_MAP.error;
  return (
    <div className={`flex items-start gap-3 rounded-2xl border-2 ${s.wrap} px-4 py-4`}>
      <svg className={`mt-0.5 h-5 w-5 flex-shrink-0 ${s.icon}`} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-.75-11.25a.75.75 0 011.5 0v4.5a.75.75 0 01-1.5 0v-4.5zm.75 7.5a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
      </svg>
      <div>
        {title && <p className={`font-bold text-sm ${s.title}`}>{title}</p>}
        {message && <p className={`text-sm mt-0.5 ${s.body}`}>{message}</p>}
      </div>
    </div>
  );
};

