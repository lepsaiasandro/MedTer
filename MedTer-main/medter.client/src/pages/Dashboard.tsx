import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../api";
import { useAuth } from "../auth";
import { usePrefs } from "../i18n";
import { Pin, Search, Users, Check, Cap, Phone, Calendar } from "../components/icons";
import { StarsView } from "../components/Stars";
import EmptyState from "../components/EmptyState";
import { SkeletonGrid } from "../components/Skeleton";
import LinearAdBanner from "../components/LinearAdBanner";
import { FilterBar, SearchField, FilterSelect, FilterChips, ResultMeta, type FilterChip } from "../components/FilterBar";
import { matchesSearch } from "../lib/search";
import { pickCardBanner } from "../lib/cardBanners";

interface TrainingCenter {
  userId: string;
  name: string;
  description?: string;
  city?: string;
  phone?: string;
  averageRating: number;
  ratingCount: number;
  myRating?: number;
  announcementCount?: number;
  upcomingCount?: number;
  categories?: string[];
}

function clipText(value: string, max = 140) {
  const text = value.trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { t } = usePrefs();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [centers, setCenters] = useState<TrainingCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const [city, setCity] = useState(() => searchParams.get("city") ?? "");
  const [sort, setSort] = useState(() => searchParams.get("sort") || "name");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get<TrainingCenter[]>("/training-centers")
      .then((r) => { if (!cancelled) setCenters(r.data); })
      .catch(() => { if (!cancelled) setCenters([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const writeParams = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, val] of Object.entries(patch)) {
      if (val === null || val === "" || (key === "sort" && val === "name")) next.delete(key);
      else next.set(key, val);
    }
    setSearchParams(next, { replace: true });
  };

  const setSearchQ = (v: string) => { setSearch(v); writeParams({ q: v || null }); };
  const setCityQ = (v: string) => { setCity(v); writeParams({ city: v || null }); };
  const setSortQ = (v: string) => { setSort(v); writeParams({ sort: v }); };

  const cities = useMemo(
    () => [...new Set(centers.map((c) => c.city).filter(Boolean))] as string[],
    [centers]
  );

  const visible = useMemo(() => {
    let list = centers.filter((c) => {
      const cats = (c.categories || []).join(" ");
      if (!matchesSearch(search, [c.name, c.description, c.city, c.phone, cats])) return false;
      if (city && c.city !== city) return false;
      return true;
    });
    if (sort === "rating") list = [...list].sort((a, b) => b.averageRating - a.averageRating || b.ratingCount - a.ratingCount);
    else if (sort === "reviews") list = [...list].sort((a, b) => b.ratingCount - a.ratingCount);
    else if (sort === "trainings") list = [...list].sort((a, b) => (b.announcementCount ?? 0) - (a.announcementCount ?? 0));
    else if (sort === "upcoming") list = [...list].sort((a, b) => (b.upcomingCount ?? 0) - (a.upcomingCount ?? 0));
    else list = [...list].sort((a, b) => a.name.localeCompare(b.name, "ka"));
    return list;
  }, [centers, search, city, sort]);

  const hasFilters = Boolean(search || city);
  const clearFilters = () => {
    setSearch(""); setCity("");
    writeParams({ q: null, city: null });
  };

  const activeChips: FilterChip[] = [
    search ? { id: "q", label: `\u201C${search.trim()}\u201D`, onClear: () => setSearchQ("") } : null,
    city ? { id: "city", label: city, onClear: () => setCityQ("") } : null,
  ].filter(Boolean) as FilterChip[];

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

      <LinearAdBanner embedded random placement="centers" />

      <FilterBar
        collapsible
        filtersLabel={t("ფილტრები", "Filters")}
        activeCount={(city ? 1 : 0) + (sort !== "name" ? 1 : 0)}
        search={
          <SearchField
            value={search}
            onChange={setSearchQ}
            placeholder={t("ძებნა სახელით, აღწერით, ქალაქით ან კატეგორიით…", "Search by name, description, city or category…")}
            aria-label={t("ცენტრების ძებნა", "Search centers")}
          />
        }
        filters={
          <>
            <FilterSelect
              value={city}
              onChange={setCityQ}
              allLabel={t("ყველა ქალაქი", "All cities")}
              options={cities.map((c) => ({ value: c, label: c }))}
              aria-label={t("ქალაქი", "City")}
            />
            <FilterSelect
              value={sort}
              onChange={setSortQ}
              defaultValue="name"
              options={[
                { value: "name", label: t("სახელით", "By name") },
                { value: "rating", label: t("შეფასებით", "By rating") },
                { value: "reviews", label: t("მიმოხილვებით", "By reviews") },
                { value: "trainings", label: t("ტრენინგების რაოდენობით", "By trainings") },
                { value: "upcoming", label: t("მომავალი ტრენინგებით", "By upcoming") },
              ]}
              aria-label={t("დალაგება", "Sort")}
            />
          </>
        }
        chips={
          <FilterChips
            chips={activeChips}
            clearLabel={t("გასუფთავება", "Clear")}
            onClearAll={clearFilters}
          />
        }
        meta={
          !loading ? (
            <ResultMeta
              shown={visible.length}
              total={centers.length}
              hasFilters={hasFilters}
              label={(shown, total) =>
                hasFilters
                  ? t(`${shown} / ${total} შედეგი`, `${shown} of ${total} results`)
                  : t(`${total} ცენტრი`, `${total} centers`)
              }
            />
          ) : null
        }
      />

      {loading ? (
        <SkeletonGrid count={6} />
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
            <button className="btn btn-ghost btn-sm" onClick={clearFilters}>
              {t("ფილტრის გასუფთავება", "Clear filters")}
            </button>
          }
        />
      ) : (
        <div className="grid">
          {visible.map((c, i) => {
            const trainings = c.announcementCount ?? 0;
            const upcoming = c.upcomingCount ?? 0;
            const categories = (c.categories || []).slice(0, 3);

            return (
              <article
                key={c.userId}
                className="card card--banner card-interactive reveal"
                style={{ animationDelay: `${Math.min(i, 8) * 40}ms`, cursor: "pointer" }}
                role="link"
                tabIndex={0}
                onClick={() => navigate(`/centers/${c.userId}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate(`/centers/${c.userId}`);
                  }
                }}
              >
                <div className="card-banner-bg" aria-hidden="true">
                  <img src={pickCardBanner(c.userId)} alt="" loading="lazy" />
                </div>
                <div className="body">
                  <div className="trust-row">
                    <span className="trust-chip trust-chip--ok"><Check size={12} /> {t("ვერიფიცირებული", "Verified")}</span>
                    {c.city && <span className="trust-chip"><Pin size={12} /> {c.city}</span>}
                  </div>
                  <h3>{c.name}</h3>
                  <StarsView value={c.averageRating} count={c.ratingCount} onDark />

                  {c.description
                    ? <p className="desc">{clipText(c.description)}</p>
                    : <p className="desc" style={{ opacity: 0.75 }}>{t("აღწერა ჯერ არ არის დამატებული.", "No description added yet.")}</p>}

                  {categories.length > 0 && (
                    <div className="center-cat-row">
                      {categories.map((cat) => (
                        <span key={cat} className="chip-cat">{cat}</span>
                      ))}
                    </div>
                  )}

                  <div className="meta">
                    <div className="row">
                      <Cap size={15} />
                      {t(`${trainings} ტრენინგი`, `${trainings} training${trainings === 1 ? "" : "s"}`)}
                      {upcoming > 0 && (
                        <span className="center-meta-sep">
                          · {t(`${upcoming} მოახლოებული`, `${upcoming} upcoming`)}
                        </span>
                      )}
                    </div>
                    {c.phone && (
                      <div className="row">
                        <Phone size={15} />
                        <a
                          href={`tel:${c.phone.replace(/\s+/g, "")}`}
                          onClick={(e) => e.stopPropagation()}
                          style={{ color: "inherit", textDecoration: "underline", textUnderlineOffset: 2 }}
                        >
                          {c.phone}
                        </a>
                      </div>
                    )}
                    {upcoming > 0 && (
                      <div className="row">
                        <Calendar size={15} />
                        {t("აქვს მომავალი ტრენინგები", "Has upcoming trainings")}
                      </div>
                    )}
                  </div>

                  <div className="foot">
                    <span style={{ fontSize: 12.5, fontWeight: 600, opacity: 0.9 }}>
                      {c.ratingCount > 0
                        ? t(`${c.ratingCount} შეფასება`, `${c.ratingCount} review${c.ratingCount === 1 ? "" : "s"}`)
                        : t("შეფასება ჯერ არ არის", "No reviews yet")}
                    </span>
                    <span className="btn btn-primary btn-sm" aria-hidden="true">
                      {t("პროფილი", "Profile")}
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
