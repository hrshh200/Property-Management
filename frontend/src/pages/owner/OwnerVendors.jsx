import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader, EmptyState } from "../../components/UI";
import {
  BriefcaseBusiness,
  Search,
  MapPin,
  Phone,
  Mail,
  Wrench,
  LayoutGrid,
  Zap,
  Droplets,
  Hammer,
  Paintbrush,
} from "lucide-react";
import api from "../../utils/api";
import toast from "react-hot-toast";

const CATEGORY_META = [
  { key: "All", icon: LayoutGrid },
  { key: "Electric", icon: Zap },
  { key: "Plumbing", icon: Droplets },
  { key: "General", icon: Wrench },
  { key: "Carpentry", icon: Hammer },
  { key: "Painting", icon: Paintbrush },
  { key: "Other", icon: BriefcaseBusiness },
];

const OwnerVendors = () => {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const { data } = await api.get("/owner/vendors");
        setVendors(data.vendors || []);
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to load vendors.");
      } finally {
        setLoading(false);
      }
    };

    fetchVendors();
  }, []);

  const filteredVendors = useMemo(() => {
    return vendors.filter((v) => {
      const text = `${v.name || ""} ${v.city || ""} ${(v.specializations || []).join(" ")}`.toLowerCase();
      const matchesSearch = !search || text.includes(search.toLowerCase());
      const matchesCategory = category === "All" || (v.specializations || []).includes(category);
      return matchesSearch && matchesCategory;
    });
  }, [vendors, search, category]);

  const categoryCounts = useMemo(() => {
    const counts = {};
    CATEGORY_META.forEach(({ key }) => {
      counts[key] = key === "All"
        ? vendors.length
        : vendors.filter((v) => (v.specializations || []).includes(key)).length;
    });
    return counts;
  }, [vendors]);

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Loading vendors...</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendors Directory"
        subtitle="Browse verified vendors from the communication panel and quickly jump to maintenance assignment."
        action={
          <Link
            to="/owner/maintenance"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2"
          >
            <Wrench size={15} /> Open Maintenance
          </Link>
        }
      />

      <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm space-y-3">
        <div className="relative max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by vendor, city, specialization"
            className="input-field"
            style={{ paddingLeft: "2rem" }}
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-2">
          {CATEGORY_META.map(({ key, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setCategory(key)}
              className={`px-2.5 py-2 rounded-lg border text-xs font-semibold transition-all flex items-center justify-between gap-2 ${
                category === key
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                  : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300"
              }`}
            >
              <span className="inline-flex items-center gap-1.5 min-w-0">
                <Icon size={13} className="shrink-0" />
                <span className="truncate">{key}</span>
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                category === key ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"
              }`}>
                {categoryCounts[key]}
              </span>
            </button>
          ))}
        </div>
      </section>

      {filteredVendors.length === 0 ? (
        <EmptyState message="No vendors found for selected filters." icon={BriefcaseBusiness} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredVendors.map((v) => (
            <div key={v._id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-gray-900">{v.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{(v.specializations || []).join(", ") || "General"}</p>
                </div>
                {v.city && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 border border-gray-200 text-gray-600 inline-flex items-center gap-1">
                    <MapPin size={10} /> {v.city}
                  </span>
                )}
              </div>

              <div className="mt-3 text-xs text-gray-700 space-y-1.5">
                <p className="inline-flex items-center gap-1.5"><Phone size={12} /> {v.phone}</p>
                {v.email && <p className="inline-flex items-center gap-1.5"><Mail size={12} /> {v.email}</p>}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  href={`tel:${String(v.phone || "").replace(/\s+/g, "")}`}
                  className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                >
                  <Phone size={12} /> Call
                </a>
                {v.email && (
                  <a
                    href={`mailto:${v.email}`}
                    className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                  >
                    <Mail size={12} /> Email
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OwnerVendors;
