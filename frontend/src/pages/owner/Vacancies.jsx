import React, { useEffect, useState } from "react";
import {
  MapPin,
  Home,
  Building2,
  DoorOpen,
  BadgeCheck,
} from "lucide-react";
import { PageHeader } from "../../components/UI";
import api from "../../utils/api";
import toast from "react-hot-toast";

const Vacancies = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);

  const fetchVacancies = async () => {
    try {
      const { data } = await api.get("/owner/vacancies");
      setProperties(data.properties);
    } catch {
      toast.error("Failed to load vacancies.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchVacancies(); }, []);

  const markOccupied = async (id) => {
    setUpdating(id);
    try {
      await api.patch(`/owner/properties/${id}/status`, { status: "Occupied" });
      toast.success("Property marked as Occupied.");
      fetchVacancies();
    } catch {
      toast.error("Update failed.");
    } finally {
      setUpdating(null);
    }
  };

  const totalVacancies = properties.length;
  const totalUnits = properties.reduce((sum, p) => sum + Number(p.numberOfRooms || 0), 0);
  const uniqueCities = new Set(properties.map((p) => p.address?.city).filter(Boolean)).size;

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vacancies"
        subtitle="Properties currently available for rent"
      />

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-900 via-orange-900 to-rose-900 px-6 py-7 sm:px-8 shadow-xl">
        <div className="absolute -top-10 -right-8 h-28 w-28 rounded-full bg-amber-300/20 blur-2xl" />
        <div className="absolute -bottom-10 -left-8 h-32 w-32 rounded-full bg-rose-300/20 blur-2xl" />
        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-4 text-white">
          <div className="md:col-span-2">
            <p className="text-xs uppercase tracking-[0.16em] text-amber-200 font-semibold">Vacancy Monitor</p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold">Convert vacant inventory into occupied units faster</h2>
            <p className="mt-2 text-sm text-amber-100 max-w-xl">
              Review availability by location and capacity, then mark occupied instantly after tenant onboarding.
            </p>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
            <p className="text-xs uppercase tracking-wider text-amber-200 font-semibold">Available Properties</p>
            <p className="mt-2 text-3xl font-extrabold">{totalVacancies}</p>
            <p className="mt-1 text-xs text-amber-100">Across {uniqueCities} cities</p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Vacant Properties</p>
          <p className="mt-2 text-3xl font-extrabold text-gray-900">{totalVacancies}</p>
          <p className="text-xs text-gray-500 mt-1">Ready to lease</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Total Vacant Units</p>
          <p className="mt-2 text-3xl font-extrabold text-amber-700">{totalUnits}</p>
          <p className="text-xs text-gray-500 mt-1">Capacity in vacant stock</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">City Coverage</p>
          <p className="mt-2 text-3xl font-extrabold text-rose-700">{uniqueCities}</p>
          <p className="text-xs text-gray-500 mt-1">Markets with vacancies</p>
        </div>
      </div>

      {properties.length === 0 ? (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 text-center py-16 px-4">
          <BadgeCheck size={48} className="mx-auto text-emerald-500 mb-4" />
          <p className="text-emerald-900 text-lg font-semibold">No Vacant Properties</p>
          <p className="text-emerald-700 text-sm mt-1">Great news, all your properties are occupied.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {properties.map((p) => (
            <div key={p._id} className="group rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
              <div className="mb-3">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full">
                  <DoorOpen size={12} /> Vacant
                </span>
              </div>
              <h3 className="font-bold text-gray-900 text-lg inline-flex items-center gap-2">
                <Building2 size={16} className="text-amber-600" />
                {p.propertyType}
              </h3>
              <p className="text-sm text-gray-600 mt-2 inline-flex items-start gap-1.5">
                <MapPin size={14} className="mt-0.5 text-gray-400" />
                <span>
                  {p.address.street}, {p.address.city}, {p.address.state}
                  {p.address.pincode ? ` - ${p.address.pincode}` : ""}
                </span>
              </p>
              {p.description ? (
                <p className="text-sm text-gray-600 mt-3 line-clamp-2 min-h-[40px]">{p.description}</p>
              ) : (
                <p className="text-sm text-gray-400 mt-3 min-h-[40px]">No description provided.</p>
              )}

              <div className="mt-3 rounded-xl bg-gray-50 px-3 py-2 flex items-center justify-between">
                <span className="text-xs text-gray-500">Capacity</span>
                <span className="text-sm font-semibold text-gray-900 inline-flex items-center gap-1.5">
                  <Home size={14} className="text-gray-500" />
                  {p.numberOfRooms} room{p.numberOfRooms !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100">
                <button
                  onClick={() => markOccupied(p._id)}
                  disabled={updating === p._id}
                  className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold py-2 transition-colors disabled:opacity-60"
                >
                  {updating === p._id ? "Updating..." : "Mark as Occupied"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Vacancies;
