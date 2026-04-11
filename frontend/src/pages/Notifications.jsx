import React, { useEffect, useState } from "react";
import { Bell, CheckCircle2 } from "lucide-react";
import { PageHeader, EmptyState } from "../components/UI";
import api from "../utils/api";
import toast from "react-hot-toast";

const typeTone = {
  rent: "border-amber-200 bg-amber-50 text-amber-800",
  maintenance: "border-blue-200 bg-blue-50 text-blue-800",
  moveout: "border-rose-200 bg-rose-50 text-rose-800",
  renewal: "border-emerald-200 bg-emerald-50 text-emerald-800",
  compliance: "border-indigo-200 bg-indigo-50 text-indigo-800",
  system: "border-gray-200 bg-gray-50 text-gray-800",
};

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const { data } = await api.get("/notifications");
      setNotifications(data.notifications || []);
    } catch {
      toast.error("Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
    } catch {
      toast.error("Unable to mark notification as read.");
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Notifications" subtitle="Recent updates across rent, maintenance, renewal and compliance" />

      {notifications.length === 0 ? (
        <EmptyState message="No notifications yet." icon={Bell} />
      ) : (
        <div className="space-y-3">
          {notifications.map((item) => (
            <div
              key={item._id}
              className={`rounded-xl border p-4 ${item.isRead ? "border-gray-100 bg-white" : "border-blue-200 bg-blue-50/40"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900">{item.title}</p>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${typeTone[item.type] || typeTone.system}`}>
                      {(item.type || "system").toUpperCase()}
                    </span>
                    {!item.isRead ? <span className="text-[11px] font-semibold text-blue-700">NEW</span> : null}
                  </div>
                  <p className="text-sm text-gray-600">{item.message}</p>
                  <p className="text-xs text-gray-500">{new Date(item.createdAt).toLocaleString()}</p>
                </div>
                {!item.isRead ? (
                  <button
                    type="button"
                    onClick={() => markRead(item._id)}
                    className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                  >
                    <CheckCircle2 size={12} /> Mark Read
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications;
