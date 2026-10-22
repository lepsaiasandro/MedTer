import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../api";
import { usePrefs } from "../i18n";
import { Search, Users, Star } from "../components/icons";
import EmptyState from "../components/EmptyState";
import { SkeletonGrid } from "../components/Skeleton";
import { matchesSearch } from "../lib/search";

interface TrainingCenter {
  userId: string;
  name: string;
  description?: string;
  city?: string;
  phone?: string;
  averageRating: number;
  ratingCount: number;
  announcementCount?: number;
  upcomingCount?: number;
  categories?: string[];
  formats?: string[];
}

type FormatKey = "online" | "offline" | "hybrid";

const AVATAR_COLORS = ["#3b82f6", "#14b8a6", "#8b5cf6", "#f59e0b", "#ef4444", "#06b6d4"];

function clipText(value: string, max = 110) {
  const text = value.trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

function formatKey(raw: string): FormatKey | null {
  const s = raw.toLowerCase();
  if (s.includes("ჰიბრიდ") || s.includes("hybrid")) return "hybrid";
  if (s.includes("ონლაინ") || s.includes("online")) return "online";
  if (s.includes("ოფლაინ") || s.includes("დასწრ") || s.includes("offline")) return "offline";
  return null;
}

function centerFormats(c: TrainingCenter): FormatKey[] {
  const keys = new Set<FormatKey>();
  for (const raw of c.formats || []) {
    const key = formatKey(raw);
    if (key) keys.add(key);
  }
  return [...keys];
}

function initials(name: string) {
  const latin = name.match(/[A-Za-z][A-Za-z]+/g);
  if (latin?.length) {
    const parts = latin[0].replace(/([a-z])([A-Z])/g, "$1 $2").split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return latin[0].slice(0, 2).toUpperCase();
  }
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return words[0][0] + words[1][0];
  return name.slice(0, 2);
}

function colorFor(id: string) {
  let n = 0;
  for (let i = 0; i < id.length; i++) n = (n + id.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[n];
}

export default function Dashboard() {
  const { t } = usePrefs();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [centers, setCenters] = useState<TrainingCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const [city, setCity] = useState(() => searchParams.get("city") ?? "");
  const [sort, setSort] = useState(() => searchParams.get("sort") || "recommended");
  const [formats, setFormats] = useState<FormatKey[]>(() => {
    const raw = searchParams.get("format") ?? "";
    return raw.split(",").filter((x): x is FormatKey => x === "online" || x === "offline" || x === "hybrid");
  });
  const [specs, setSpecs] = useState<string[]>(() => (searchParams.get("spec") ?? "").split(",").filter(Boolean));
  const [minRating, setMinRating] = useState(() => Number(searchParams.get("rate") || "0"));

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
      if (val === null || val === "" || (key === "sort" && val === "recommended") || (key === "rate" && val === "0")) next.delete(key);
      else next.set(key, val);
    }
    setSearchParams(next, { replace: true });
  };

  const setSearchQ = (v: string) => { setSearch(v); writeParams({ q: v || null }); };
  const setCityQ = (v: string) => { setCity(v); writeParams({ city: v || null }); };
  const setSortQ = (v: string) => { setSort(v); writeParams({ sort: v }); };
  const setFormatsQ = (next: FormatKey[]) => { setFormats(next); writeParams({ format: next.join(",") || null }); };
  const setSpecsQ = (next: string[]) => { setSpecs(next); writeParams({ spec: next.join(",") || null }); };
  const setRateQ = (v: number) => { setMinRating(v); writeParams({ rate: String(v) }); };

  const toggleFormat = (key: FormatKey) => {
    setFormatsQ(formats.includes(key) ? formats.filter((f) => f !== key) : [...formats, key]);
  };
  const toggleSpec = (name: string) => {
    setSpecsQ(specs.includes(name) ? specs.filter((s) => s !== name) : [...specs, name]);
  };

  const formatLabel = (key: FormatKey) =>
    key === "online" ? t("ონლაინ", "Online") : key === "offline" ? t("ოფლაინ", "In person") : t("ჰიბრიდი", "Hybrid");

  const cities = useMemo(
    () => [...new Set(centers.map((c) => c.city).filter(Boolean))] as string[],
    [centers]
  );
  const specialties = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of centers) {
      for (const cat of c.categories || []) counts.set(cat, (counts.get(cat) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ka"));
  }, [centers]);

  const formatCounts = useMemo(() => {
    const counts: Record<FormatKey, number> = { online: 0, offline: 0, hybrid: 0 };
    for (const c of centers) {
      for (const key of centerFormats(c)) counts[key] += 1;
    }
    return counts;
  }, [centers]);

  const visible = useMemo(() => {
    let list = centers.filter((c) => {
      const cats = (c.categories || []).join(" ");
      const fmts = (c.formats || []).join(" ");
      if (!matchesSearch(search, [c.name, c.description, c.city, cats, fmts])) return false;
      if (city && c.city !== city) return false;
      if (formats.length) {
        const keys = centerFormats(c);
        if (!formats.some((f) => keys.includes(f))) return false;
      }
      if (specs.length && !specs.some((s) => (c.categories || []).includes(s))) return false;
      if (minRating > 0 && c.averageRating < minRating) return false;
      return true;
    });
    if (sort === "rating") list = [...list].sort((a, b) => b.averageRating - a.averageRating || b.ratingCount - a.ratingCount);
    else if (sort === "reviews") list = [...list].sort((a, b) => b.ratingCount - a.ratingCount);
    else if (sort === "name") list = [...list].sort((a, b) => a.name.localeCompare(b.name, "ka"));
    else list = [...list].sort((a, b) =>
      (b.averageRating - a.averageRating)
      || ((b.upcomingCount ?? 0) - (a.upcomingCount ?? 0))
      || a.name.localeCompare(b.name, "ka"));
    return list;
  }, [centers, search, city, sort, formats, specs, minRating]);

  const hasFilters = Boolean(search || city || formats.length || specs.length || minRating > 0);
  const clearFilters = () => {
    setSearch(""); setCity(""); setFormats([]); setSpecs([]); setMinRating(0);
    writeParams({ q: null, city: null, format: null, spec: null, rate: null });
  };

  const quickChips: { id: string; label: string; on: boolean; toggle: () => void }[] = [
    { id: "online", label: t("ონლაინი", "Online"), on: formats.includes("online"), toggle: () => toggleFormat("online") },
    { id: "offline", label: t("ოფლაინი", "In person"), on: formats.includes("offline"), toggle: () => toggleFormat("offline") },
    ...specialties.slice(0, 3).map(([name]) => ({
      id: `spec-${name}`,
      label: name,
      on: specs.includes(name),
      toggle: () => toggleSpec(name),
    })),
    ...cities.slice(0, 2).map((name) => ({
      id: `city-${name}`,
      label: name,
      on: city === name,
      toggle: () => setCityQ(city === name ? "" : name),
    })),
  ];

  return (
    <div className="dir">
      <div className="dir-crumb">
        <Link to="/announcements">{t("მთავარი", "Home")}</Link>
        <span>/</span>
        <span>{t("ტრენინგ ცენტრები", "Training Centers")}</span>
      </div>

      <div className="dir-head">
        <h1>{t("ტრენინგ ცენტრები", "Training Centers")}</h1>
        <p>{t("აირჩიე ცენტრი შენი სპეციალობისა და ფორმატის მიხედვით.", "Choose a center by specialty and format.")}</p>
      </div>

      <label className="dir-search">
        <Search size={16} />
        <input
          value={search}
          onChange={(e) => setSearchQ(e.target.value)}
          placeholder={t("მოძებნე ცენტრი სახელით ან სპეციალობით", "Search a center by name or specialty")}
          aria-label={t("ცენტრების ძებნა", "Search centers")}
        />
      </label>

      <div className="dir-chips" role="group" aria-label={t("სწრაფი ფილტრები", "Quick filters")}>
        {quickChips.map((chip) => (
          <button key={chip.id} type="button" className={chip.on ? "on" : ""} onClick={chip.toggle}>
            {chip.label}
          </button>
        ))}
      </div>

      <div className="dir-layout">
        <aside className="dir-side">
          <div className="dir-side-head">
            <b>{t("ფილტრები", "Filters")}</b>
            <button type="button" onClick={clearFilters} disabled={!hasFilters}>{t("გასუფთავება", "Clear")}</button>
          </div>

          <div className="dir-filter">
            <h3>{t("ფორმატი", "Format")}</h3>
            {(["online", "offline", "hybrid"] as FormatKey[]).map((key) => (
              <label key={key}>
                <input type="checkbox" checked={formats.includes(key)} onChange={() => toggleFormat(key)} />
                <span>{formatLabel(key)}</span>
                <em>{formatCounts[key]}</em>
              </label>
            ))}
          </div>

          <div className="dir-filter">
            <h3>{t("ქალაქი", "City")}</h3>
            <select value={city} onChange={(e) => setCityQ(e.target.value)} aria-label={t("ქალაქი", "City")}>
              <option value="">{t("ყველა ქალაქი", "All cities")}</option>
              {cities.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {specialties.length > 0 && (
            <div className="dir-filter">
              <h3>{t("სპეციალობა", "Specialty")}</h3>
              {specialties.map(([name]) => (
                <label key={name}>
                  <input type="checkbox" checked={specs.includes(name)} onChange={() => toggleSpec(name)} />
                  <span>{name}</span>
                </label>
              ))}
            </div>
          )}

          <div className="dir-filter">
            <h3>{t("შეფასება", "Rating")}</h3>
            {[4, 3].map((n) => (
              <label key={n}>
                <input
                  type="checkbox"
                  checked={minRating === n}
                  onChange={() => setRateQ(minRating === n ? 0 : n)}
                />
                <span>{n}+ <Star size={12} filled /></span>
              </label>
            ))}
          </div>
        </aside>

        <section className="dir-main">
          <div className="dir-meta">
            <span>{loading ? "…" : t(`ნაპოვნია ${visible.length} ცენტრი`, `${visible.length} centers found`)}</span>
            <select value={sort} onChange={(e) => setSortQ(e.target.value)} aria-label={t("დალაგება", "Sort")}>
              <option value="recommended">{t("რეკომენდებული", "Recommended")}</option>
              <option value="rating">{t("შეფასებით", "By rating")}</option>
              <option value="reviews">{t("მიმოხილვებით", "By reviews")}</option>
              <option value="name">{t("სახელით", "By name")}</option>
            </select>
          </div>

          {loading ? (
            <SkeletonGrid count={4} />
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
            <div className="dir-grid">
              {visible.map((c) => {
                const keys = centerFormats(c);
                const place = [c.city, keys.map(formatLabel).join(" · ")].filter(Boolean).join(" · ");
                const tags = [...(c.categories || []).slice(0, 2), ...keys.slice(0, 1).map(formatLabel)];
                const rating = c.averageRating > 0 ? c.averageRating.toFixed(1) : "";
                return (
                  <article key={c.userId} className="dir-card">
                    <div className="dir-card-top">
                      <span className="dir-av" style={{ background: colorFor(c.userId) }}>{initials(c.name)}</span>
                      <div className="dir-card-id">
                        <h3>{c.name}</h3>
                        {place && <p>{place}</p>}
                      </div>
                      {(c.upcomingCount ?? 0) > 0 && <span className="dir-new">{t("ახალი", "New")}</span>}
                    </div>
                    <p className="dir-desc">
                      {c.description ? clipText(c.description) : t("აღწერა ჯერ არ არის დამატებული.", "No description added yet.")}
                    </p>
                    {(tags.length > 0 || (c.announcementCount ?? 0) > 0) && (
                      <div className="dir-tags">
                        {tags.map((tag) => <span key={tag}>{tag}</span>)}
                        {(c.announcementCount ?? 0) > 0 && <span className="dir-num">{c.announcementCount}</span>}
                      </div>
                    )}
                    <div className="dir-foot">
                      {rating ? (
                        <span className="dir-rate">
                          <Star size={13} filled /> {rating}
                          <em>{t(`${c.ratingCount} მიმოხილვა`, `${c.ratingCount} reviews`)}</em>
                        </span>
                      ) : <span />}
                      <button type="button" className="btn btn-primary btn-sm" onClick={() => navigate(`/centers/${c.userId}`)}>
                        {t("დეტალები", "Details")}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
