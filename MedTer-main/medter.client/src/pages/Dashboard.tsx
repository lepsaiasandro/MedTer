import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { useAuth } from "../auth";
import { usePrefs } from "../i18n";
import { Pin, Search, Users, Check } from "../components/icons";
import { StarsView } from "../components/Stars";
import MediaPlaceholder from "../components/MediaPlaceholder";
import EmptyState from "../components/EmptyState";
import { SkeletonGrid } from "../components/Skeleton";

interface TrainingCenter {
  userId: string;
  name: string;
  description?: string;
  city?: string;
  phone?: string;
  averageRating: number;
  ratingCount: number;
  myRating?: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { t } = usePrefs();
  const navigate = useNavigate();
  const [centers, setCenters] = useState<TrainingCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");
  const [sort, setSort] = useState("name");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get<TrainingCenter[]>("/training-centers")
      .then((r) => { if (!cancelled) setCenters(r.data); })
      .catch(() => { if (!cancelled) setCenters([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const cities = useMemo(
    () => [...new Set(centers.map((c) => c.city).filter(Boolean))] as string[],
    [centers]
  );

  const visible = useMemo(() => {
    let list = centers.filter((c) => {
      if (search) {
        const q = search.toLowerCase();
        const hay = `${c.name} ${c.description ?? ""} ${c.city ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (city && c.city !== city) return false;
      return true;
    });
    if (sort === "rating") list = [...list].sort((a, b) => b.averageRating - a.averageRating || b.ratingCount - a.ratingCount);
    else if (sort === "reviews") list = [...list].sort((a, b) => b.ratingCount - a.ratingCount);
    else list = [...list].sort((a, b) => a.name.localeCompare(b.name, "ka"));
    return list;
  }, [centers, search, city, sort]);

  return (
    <div>
      <div className="page-head">
        <div className="h-text">
          <h1>{t("ტრენინგ ცენტრები", "Training Centers")}</h1>
          <p>{user?.role === "Doctor"
            ? t("იპოვე ტრენინგ ცენტრები და დაათვალიერე პროფილები.", "Find training centers and browse profiles.")
            : t("ნახე პლატფორმაზე რეგისტრირებული ტრენინგ ცენტრები.", "Browse training centers registered on the platform.")}</p>
        </div>
      </div>

      <div className="toolbar">
        <select className="control" style={{ width: "auto" }} value={city} onChange={(e) => setCity(e.target.value)}>
          <option value="">{t("ყველა ქალაქი", "All cities")}</option>
          {cities.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="control" style={{ width: "auto" }} value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="name">{t("სახელით", "By name")}</option>
          <option value="rating">{t("შეფასებით", "By rating")}</option>
          <option value="reviews">{t("მიმოხილვებით", "By reviews")}</option>
        </select>
        <div className="search">
          <Search size={16} />
          <input
            placeholder={t("ძებნა სახელით ან ქალაქით…", "Search by name or city…")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <SkeletonGrid count={8} cols="grid-4" />
      ) : centers.length === 0 ? (
        <EmptyState
          icon={<Users size={42} sw={1.6} />}
          title={t("ჯერ არ არის ტრენინგ ცენტრები", "No training centers yet")}
          text={t("როგორც კი ცენტრები დარეგისტრირდებიან და დამტკიცდებიან, აქ დაინახავ.", "Once centers register and are approved, you'll see them here.")}
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<Search size={42} sw={1.6} />}
          title={t("ვერაფერი მოიძებნა", "Nothing found")}
          text={t("შეცვალე ფილტრი ან საძიებო სიტყვა.", "Try a different filter or search term.")}
          action={
            <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(""); setCity(""); }}>
              {t("ფილტრის გასუფთავება", "Clear filters")}
            </button>
          }
        />
      ) : (
        <div className="grid grid-4">
          {visible.map((c, i) => (
            <article
              key={c.userId}
              className="card card-interactive reveal"
              style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
            >
              <div className="media">
                <MediaPlaceholder title={c.name} subtitle={c.city} variant={i % 2 === 0 ? "brand" : "teal"} />
              </div>
              <div className="body">
                <div className="trust-row">
                  <span className="trust-chip trust-chip--ok"><Check size={12} /> {t("ვერიფიცირებული", "Verified")}</span>
                  {c.city && <span className="trust-chip"><Pin size={12} /> {c.city}</span>}
                </div>
                <h3>{c.name}</h3>
                <StarsView value={c.averageRating} count={c.ratingCount} />
                {c.description && <p className="desc" style={{ flex: 1 }}>{c.description}</p>}
                {user && (
                  <div style={{ marginTop: "auto", paddingTop: 4 }}>
                    <button className="btn btn-ghost btn-sm btn-block" onClick={() => navigate(`/centers/${c.userId}`)}>
                      {t("დეტალურად", "Details")}
                    </button>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
