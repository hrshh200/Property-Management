import React from "react";

export const StatCard = ({ title, value, icon: Icon, color = "blue", subtitle }) => {
  const colorMap = {
    blue:   { icon: "bg-blue-600",   shadow: "shadow-blue-100",   text: "text-blue-700" },
    green:  { icon: "bg-emerald-600", shadow: "shadow-emerald-100", text: "text-emerald-700" },
    red:    { icon: "bg-red-500",     shadow: "shadow-red-100",     text: "text-red-700" },
    yellow: { icon: "bg-amber-500",   shadow: "shadow-amber-100",   text: "text-amber-700" },
    purple: { icon: "bg-purple-600",  shadow: "shadow-purple-100",  text: "text-purple-700" },
    gray:   { icon: "bg-gray-500",    shadow: "shadow-gray-100",    text: "text-gray-700" },
  };
  const c = colorMap[color] || colorMap.blue;
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-all duration-200 group">
      <div className={`p-3 rounded-xl ${c.icon} shadow-lg ${c.shadow} group-hover:scale-105 transition-transform duration-200`}>
        <Icon size={22} className="text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</p>
        <p className="text-2xl font-extrabold text-gray-900 mt-0.5">{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
};

const STATUS_MAP = {
  Paid:         { cls: "badge-green",  dot: "bg-emerald-500" },
  Pending:      { cls: "badge-yellow", dot: "bg-amber-400" },
  Overdue:      { cls: "badge-red",    dot: "bg-red-500" },
  Open:         { cls: "badge-red",    dot: "bg-red-500" },
  "In Progress":{ cls: "badge-yellow", dot: "bg-amber-400" },
  Resolved:     { cls: "badge-green",  dot: "bg-emerald-500" },
  Occupied:     { cls: "badge-blue",   dot: "bg-blue-500" },
  Vacant:       { cls: "badge-gray",   dot: "bg-gray-400" },
  Active:       { cls: "badge-green",  dot: "bg-emerald-500" },
  Inactive:     { cls: "badge-gray",   dot: "bg-gray-400" },
  Approved:     { cls: "badge-green",  dot: "bg-emerald-500" },
  Rejected:     { cls: "badge-red",    dot: "bg-red-500" },
  Completed:    { cls: "badge-blue",   dot: "bg-blue-500" },
  Cancelled:    { cls: "badge-gray",   dot: "bg-gray-400" },
  Accepted:     { cls: "badge-green",  dot: "bg-emerald-500" },
};

export const StatusBadge = ({ status }) => {
  const { cls, dot } = STATUS_MAP[status] || { cls: "badge-gray", dot: "bg-gray-400" };
  return (
    <span className={`${cls} inline-flex items-center gap-1.5`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot} shrink-0`} />
      {status}
    </span>
  );
};

export const PageHeader = ({ title, subtitle, action }) => (
  <div className="flex items-start justify-between mb-6">
    <div>
      <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">{title}</h1>
      {subtitle && <p className="text-gray-500 text-sm mt-1 leading-relaxed">{subtitle}</p>}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);

export const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto ring-1 ring-black/5">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50/80 to-white rounded-t-3xl">
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors text-lg font-bold leading-none"
          >
            ×
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
};

export const EmptyState = ({ message, icon: Icon }) => (
  <div className="text-center py-16 flex flex-col items-center">
    {Icon && (
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center mb-4 shadow-inner ring-1 ring-gray-100">
        <Icon size={34} className="text-gray-300" />
      </div>
    )}
    <p className="text-gray-500 text-base font-medium">{message}</p>
    <p className="text-gray-400 text-sm mt-1">Nothing to display yet.</p>
  </div>
);
