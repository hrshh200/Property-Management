import React from "react";

export const StatCard = ({ title, value, icon: Icon, color = "blue", subtitle }) => {
  const colorMap = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    red: "bg-red-50 text-red-600",
    yellow: "bg-yellow-50 text-yellow-600",
    purple: "bg-purple-50 text-purple-600",
    gray: "bg-gray-50 text-gray-600",
  };
  return (
    <div className="card flex items-center gap-4">
      <div className={`p-3 rounded-xl ${colorMap[color]}`}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
      </div>
    </div>
  );
};

export const StatusBadge = ({ status }) => {
  const map = {
    Paid: "badge-green",
    Pending: "badge-yellow",
    Overdue: "badge-red",
    Open: "badge-red",
    "In Progress": "badge-yellow",
    Resolved: "badge-green",
    Occupied: "badge-blue",
    Vacant: "badge-gray",
    Active: "badge-green",
    Inactive: "badge-gray",
    Approved: "badge-green",
    Rejected: "badge-red",
    Completed: "badge-blue",
  };
  return <span className={map[status] || "badge-gray"}>{status}</span>;
};

export const PageHeader = ({ title, subtitle, action }) => (
  <div className="flex items-start justify-between mb-6">
    <div>
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      {subtitle && <p className="text-gray-500 text-sm mt-1">{subtitle}</p>}
    </div>
    {action && <div>{action}</div>}
  </div>
);

export const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">
            ×
          </button>
        </div>
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  );
};

export const EmptyState = ({ message, icon: Icon }) => (
  <div className="text-center py-16">
    {Icon && <Icon size={48} className="mx-auto text-gray-300 mb-4" />}
    <p className="text-gray-400 text-lg">{message}</p>
  </div>
);
