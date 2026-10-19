import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../api";
import { useAuth } from "../auth";
import { usePrefs } from "../i18n";
import { Calendar, Pin, Mail, Search, Check, Bookmark, Cap, Chat, X, ExternalLink, Star, ThumbUp } from "../components/icons";
import ShareMenu from "../components/ShareMenu";
import PointsPanel from "../components/PointsPanel";
import EmptyState from "../components/EmptyState";
import AuthRequired from "../components/AuthRequired";
import LinearAdBanner, { useSponsoredCreatives } from "../components/LinearAdBanner";
import SponsoredEventCard from "../components/SponsoredEventCard";
import EventDetailModal from "../components/EventDetailModal";
import { FilterBar, FilterSelect, FilterToggle, FilterChips, ResultMeta, type FilterChip } from "../components/FilterBar";
import { matchesSearch } from "../lib/search";
import { pickCardBanner } from "../lib/cardBanners";

interface Announcement {
  id: number;
  title: string;
  type?: string;
  category?: string;
  format?: string;
  shortDescription?: string;
  description?: string;
  city?: string;
  meetingAccess?: string;
  duration?: string;
  language?: string;
  points: number;
  price: number;
  seats?: number;
  imageUrl?: string;
  startDate?: string;
  registrationDeadline?: string;
  centerUserId?: string;
  centerName: string;
  interestedCount: number;
  isInterested: boolean;
  isFavorite: boolean;
  hasGroupChat?: boolean;
}

interface InterestResponse {
  meetingAccess?: string;
  city?: string;
  format?: string;
}

const MONTHS_KA = ["იანვარი", "თებერვალი", "მარტი", "აპრილი", "მაისი", "ივნისი", "ივლისი", "აგვისტო", "სექტემბერი", "ოქტომბერი", "ნოემბერი", "დეკემბერი"];
const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTHS_SHORT_KA = ["იან", "თებ", "მარ", "აპრ", "მაი", "ივნ", "ივლ", "აგვ", "სექ", "ოქტ", "ნოე", "დეკ"];
const MONTHS_SHORT_EN = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

type Flash = {
  kind: "ok" | "err";
  text: string;
  actionMine?: boolean;
  meetingAccess?: string;
  meetingCity?: string;
  meetingFormat?: string;
};

const isHttpUrl = (value: string) => /^https?:\/\//i.test(value.trim());

function dayKey(iso?: string) {
  if (!iso) return "nodate";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "nodate";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function Announcements() {
  const { user } = useAuth();
  if (!user) {
    return (
      <AuthRequired
        titleKa="ტრენინგების ფიდის სანახავად ანგარიში გჭირდება"
        titleEn="You need an account to view the trainings feed"
        textKa="შექმენი ანგარიში ან შედი — შემდეგ დაინახავ ყველა ტრენინგს Events-ის მსგავს ფიდში."
        textEn="Create an account or sign in — then you'll see all trainings in an Events-style feed."
      />
    );
  }
  return <AnnouncementsFeed />;
}

function AnnouncementsFeed() {
  const { user } = useAuth();
  const { t, lang } = usePrefs();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isDoctor = user?.role === "Doctor";
  const mineTab = isDoctor && searchParams.get("mine") === "1";
  const justRegistered = searchParams.get("welcome") === "1";
  const sponsored = useSponsoredCreatives("trainings");

  const [items, setItems] = useState<Announcement[]>([]);
  const [mineItems, setMineItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalId, setModalId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [flash, setFlash] = useState<Flash | null>(null);
  /** Local like counts (seeded from engagement; Like toggles favorite). */
  const [likeCounts, setLikeCounts] = useState<Record<number, number>>({});

  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const [category, setCategory] = useState(() => searchParams.get("cat") ?? "");
  const [format, setFormat] = useState(() => searchParams.get("format") ?? "");
  const [city, setCity] = useState(() => searchParams.get("city") ?? "");
  const [sort, setSort] = useState(() => searchParams.get("sort") || "newest");
  const [favOnly, setFavOnly] = useState(() => searchParams.get("fav") === "1");

  useEffect(() => {
    const q = searchParams.get("q") ?? "";
    setSearch(q);
  }, [searchParams]);

  const fmtDate = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    const m = (lang === "en" ? MONTHS_EN : MONTHS_KA)[d.getMonth()];
    return `${d.getDate()} ${m}, ${d.getFullYear()}`;
  };

  const fmtDateTime = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    const time = d.toLocaleTimeString(lang === "en" ? "en-GB" : "ka-GE", { hour: "2-digit", minute: "2-digit" });
    return `${fmtDate(iso)} · ${time}`;
  };

  const fmtTime = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString(lang === "en" ? "en-GB" : "ka-GE", { hour: "2-digit", minute: "2-digit" });
  };

  const dateParts = (iso?: string) => {
    if (!iso) return null;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    return {
      day: d.getDate(),
      month: (lang === "en" ? MONTHS_SHORT_EN : MONTHS_SHORT_KA)[d.getMonth()],
      weekday: d.toLocaleDateString(lang === "en" ? "en-GB" : "ka-GE", { weekday: "long" }),
      year: d.getFullYear(),
    };
  };

  const findAnnouncement = (id: number) =>
    mineItems.find((x) => x.id === id) ?? items.find((x) => x.id === id);

  const modalAnnouncement = modalId != null ? findAnnouncement(modalId) : null;

  const loadBrowse = () =>
    api.get<Announcement[]>("/announcements")
      .then((r) => setItems(r.data))
      .catch(() => setItems([]));

  const loadMine = () =>
    isDoctor
      ? api.get<Announcement[]>("/announcements/my-registrations")
          .then((r) => setMineItems(r.data))
          .catch(() => setMineItems([]))
      : Promise.resolve();

  const load = async (opts?: { soft?: boolean }) => {
    if (!opts?.soft) setLoading(true);
    try {
      await Promise.all([loadBrowse(), loadMine()]);
    } finally {
      if (!opts?.soft) setLoading(false);
    }
  };

  useEffect(() => { load(); }, [isDoctor]);

  useEffect(() => {
    setLikeCounts((prev) => {
      const next = { ...prev };
      for (const a of items) {
        if (next[a.id] == null) {
          next[a.id] = a.interestedCount + (a.isFavorite ? 1 : 0);
        }
      }
      return next;
    });
  }, [items]);

  useEffect(() => {
    if (searchParams.get("tab") === "centers") {
      navigate("/centers", { replace: true });
    }
  }, [searchParams, navigate]);

  useEffect(() => {
    if (!justRegistered) return;
    setFlash({
      kind: "ok",
      text: t(
        "ანგარიში შექმნილია — შეგიძლია ტრენინგების დათვალიერება და რეგისტრაცია.",
        "Account created — you can browse trainings and register."
      ),
    });
    const next = new URLSearchParams(searchParams);
    next.delete("welcome");
    setSearchParams(next, { replace: true });
  }, [justRegistered]);

  useEffect(() => {
    if (!flash) return;
    const id = window.setTimeout(() => setFlash(null), 6500);
    return () => window.clearTimeout(id);
  }, [flash]);

  useEffect(() => {
    if (modalId == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModalId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalId]);

  const writeFilterParams = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, val] of Object.entries(patch)) {
      if (val === null || val === "" || (key === "sort" && val === "newest") || (key === "fav" && val !== "1")) {
        next.delete(key);
      } else {
        next.set(key, val);
      }
    }
    setSearchParams(next, { replace: true });
  };

  const setCategoryQ = (v: string) => { setCategory(v); writeFilterParams({ cat: v || null }); };
  const setFormatQ = (v: string) => { setFormat(v); writeFilterParams({ format: v || null }); };
  const setCityQ = (v: string) => { setCity(v); writeFilterParams({ city: v || null }); };
  const setSortQ = (v: string) => { setSort(v); writeFilterParams({ sort: v }); };
  const setFavOnlyQ = (v: boolean) => { setFavOnly(v); writeFilterParams({ fav: v ? "1" : null }); };

  const setTab = (mine: boolean) => {
    setModalId(null);
    const next = new URLSearchParams(searchParams);
    if (mine) next.set("mine", "1");
    else next.delete("mine");
    setSearchParams(next);
  };

  const patchLists = (id: number, patch: Partial<Announcement>) => {
    const apply = (list: Announcement[]) => list.map((a) => (a.id === id ? { ...a, ...patch } : a));
    setItems((prev) => apply(prev));
    setMineItems((prev) => apply(prev));
  };

  const renderMeetingAccess = (a: Pick<Announcement, "format" | "meetingAccess" | "city">) => {
    const access = (a.meetingAccess || "").trim();
    const fallback = access || a.city;
    if (!fallback) return null;
    const linkLike = a.format === "ონლაინ" || isHttpUrl(access);
    const href = isHttpUrl(access) ? access : undefined;
    return (
      <div className="meeting-access">
        {linkLike ? <ExternalLink size={15} /> : <Pin size={15} />}
        <div>
          <span>
            {linkLike ? t("შეხვედრის ლინკი", "Meeting link") : t("ლოკაცია", "Location")}
          </span>
          {href
            ? <a href={href} target="_blank" rel="noopener noreferrer">{access}</a>
            : <b>{fallback}</b>}
        </div>
      </div>
    );
  };

  const toggleInterest = async (a: Announcement) => {
    if (busyId === a.id) return;
    setBusyId(a.id);
    const nextInterested = !a.isInterested;
    const nextCount = Math.max(0, a.interestedCount + (nextInterested ? 1 : -1));
    patchLists(a.id, { isInterested: nextInterested, interestedCount: nextCount });

    try {
      if (a.isInterested) {
        await api.delete(`/announcements/${a.id}/interest`);
        setMineItems((prev) => prev.filter((x) => x.id !== a.id));
        if (modalId === a.id) setModalId(null);
        setFlash({ kind: "ok", text: t("რეგისტრაცია გაუქმდა", "Registration cancelled") });
      } else {
        const res = await api.post<InterestResponse>(`/announcements/${a.id}/interest`);
        const merged: Partial<Announcement> = {
          isInterested: true,
          interestedCount: nextCount,
          meetingAccess: res.data.meetingAccess ?? a.meetingAccess,
          city: res.data.city ?? a.city,
          format: res.data.format ?? a.format,
        };
        /* Going implies Interested (Facebook Events behavior) */
        if (!a.isFavorite) {
          try { await api.post(`/announcements/${a.id}/favorite`); } catch { /* optional */ }
          merged.isFavorite = true;
          setLikeCounts((c) => ({
            ...c,
            [a.id]: Math.max(0, (c[a.id] ?? a.interestedCount) + 1),
          }));
        }
        patchLists(a.id, merged);
        const updated = { ...a, ...merged, isInterested: true, interestedCount: nextCount };
        setMineItems((prev) => {
          if (prev.some((x) => x.id === a.id)) {
            return prev.map((x) => (x.id === a.id ? updated : x));
          }
          return [updated, ...prev];
        });
        setModalId(a.id);
        setFlash({
          kind: "ok",
          text: t(`დარეგისტრირდი: ${a.title}`, `Registered: ${a.title}`),
          actionMine: true,
          meetingAccess: res.data.meetingAccess,
          meetingCity: res.data.city ?? a.city,
          meetingFormat: res.data.format ?? a.format,
        });
      }
      void load({ soft: true });
    } catch {
      patchLists(a.id, { isInterested: a.isInterested, interestedCount: a.interestedCount });
      setFlash({
        kind: "err",
        text: t("რეგისტრაცია ვერ მოხერხდა. სცადე თავიდან.", "Registration failed. Please try again."),
      });
    } finally {
      setBusyId(null);
    }
  };

  const toggleFav = async (a: Announcement) => {
    const next = !a.isFavorite;
    const prevCount = likeCounts[a.id] ?? a.interestedCount;
    patchLists(a.id, { isFavorite: next });
    setLikeCounts((c) => ({ ...c, [a.id]: Math.max(0, prevCount + (next ? 1 : -1)) }));
    try {
      if (a.isFavorite) await api.delete(`/announcements/${a.id}/favorite`);
      else await api.post(`/announcements/${a.id}/favorite`);
    } catch {
      patchLists(a.id, { isFavorite: a.isFavorite });
      setLikeCounts((c) => ({ ...c, [a.id]: prevCount }));
    }
  };

  const stopCard = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
  };

  const registeredCount = mineItems.length;
  const source = mineTab ? mineItems : items;

  const categories = useMemo(() => [...new Set(source.map((a) => a.category).filter(Boolean))] as string[], [source]);
  const cities = useMemo(() => [...new Set(source.map((a) => a.city).filter(Boolean))] as string[], [source]);

  const visible = useMemo(() => {
    let list = source.filter((a) => {
      if (!matchesSearch(search, [a.title, a.centerName, a.category, a.city, a.shortDescription, a.description, a.type, a.format])) {
        return false;
      }
      if (category && a.category !== category) return false;
      if (format && a.format !== format) return false;
      if (city && a.city !== city) return false;
      if (!mineTab && favOnly && !a.isFavorite) return false;
      return true;
    });
    if (sort === "date") list = [...list].sort((a, b) => new Date(a.startDate ?? 0).getTime() - new Date(b.startDate ?? 0).getTime());
    else if (sort === "points") list = [...list].sort((a, b) => b.points - a.points);
    else if (sort === "interested") list = [...list].sort((a, b) => b.interestedCount - a.interestedCount);
    else list = [...list].sort((a, b) => new Date(b.startDate ?? 0).getTime() - new Date(a.startDate ?? 0).getTime() || b.id - a.id);
    return list;
  }, [source, search, category, format, city, favOnly, sort, mineTab]);

  const grouped = useMemo(() => {
    const map = new Map<string, Announcement[]>();
    for (const a of visible) {
      const key = dayKey(a.startDate);
      const bucket = map.get(key);
      if (bucket) bucket.push(a);
      else map.set(key, [a]);
    }
    return [...map.entries()];
  }, [visible]);

  const hasFilters = Boolean(search || category || format || city || favOnly);

  const clearFilters = () => {
    setSearch(""); setCategory(""); setFormat(""); setCity(""); setFavOnly(false);
    writeFilterParams({ q: null, cat: null, format: null, city: null, fav: null });
  };

  const activeChips: FilterChip[] = [
    search ? { id: "q", label: `\u201C${search.trim()}\u201D`, onClear: () => writeFilterParams({ q: null }) } : null,
    category ? { id: "cat", label: category, onClear: () => setCategoryQ("") } : null,
    format ? {
      id: "format",
      label: format === "ონლაინ" ? t("ონლაინ", "Online") : t("დასწრებით", "In person"),
      onClear: () => setFormatQ(""),
    } : null,
    city ? { id: "city", label: city, onClear: () => setCityQ("") } : null,
    favOnly && !mineTab ? { id: "fav", label: t("რჩეულები", "Favorites"), onClear: () => setFavOnlyQ(false) } : null,
  ].filter(Boolean) as FilterChip[];

  const placeLabel = (a: Announcement) => {
    const online = a.format === "ონლაინ";
    return online ? t("ონლაინ", "Online") : (a.city || t("დასწრებით", "In person"));
  };

  const sectionTitle = (key: string, first: Announcement) => {
    if (key === "nodate") return t("თარიღი მითითებული არ არის", "Date not set");
    const parts = dateParts(first.startDate);
    if (!parts) return t("თარიღი მითითებული არ არის", "Date not set");
    return `${parts.weekday} · ${parts.day} ${parts.month} ${parts.year}`;
  };

  return (
    <div className="announcements-layout">
      <div className="announcements-main">
        {flash && (
          <div className={`train-flash train-flash--${flash.kind}`} role="status">
            <div className="train-flash-icon">
              {flash.kind === "ok" ? <Check size={16} /> : <X size={16} />}
            </div>
            <div className="train-flash-body">
              <p>{flash.text}</p>
              {flash.kind === "ok" && (flash.meetingAccess || flash.meetingCity) && renderMeetingAccess({
                format: flash.meetingFormat,
                meetingAccess: flash.meetingAccess,
                city: flash.meetingCity,
              })}
              {flash.actionMine && isDoctor && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setTab(true)}>
                  {t("ჩემი ტრენინგები", "My trainings")}
                </button>
              )}
            </div>
            <button type="button" className="act" aria-label="Close" onClick={() => setFlash(null)}>
              <X size={16} />
            </button>
          </div>
        )}

        <div className="page-head events-page-head">
          <div className="h-text">
            <h1>{mineTab ? t("ჩემი ტრენინგები", "My Trainings") : t("ტრენინგები", "Trainings")}</h1>
            <p>
              {mineTab
                ? t("შენი რეგისტრაციები — თარიღი და დეტალები", "Your registrations — dates and details")
                : t("Events ფიდი — დაათვალიერე და დაარეგისტრირდი", "Events feed — browse and register")}
            </p>
          </div>
        </div>

        <LinearAdBanner embedded random placement="trainings" />

        {isDoctor && (
          <div className="segment" style={{ marginBottom: 16 }}>
            <button type="button" className={!mineTab ? "active" : ""} onClick={() => setTab(false)}>
              {t("ყველა", "All")}
            </button>
            <button type="button" className={mineTab ? "active" : ""} onClick={() => setTab(true)}>
              {t("ჩემი", "Mine")}
              <span className="count">{registeredCount}</span>
            </button>
          </div>
        )}

        <FilterBar
          filters={
            <>
              <FilterSelect
                value={category}
                onChange={setCategoryQ}
                allLabel={t("კატეგორია", "Category")}
                options={categories.map((c) => ({ value: c, label: c }))}
                aria-label={t("კატეგორია", "Category")}
              />
              <FilterSelect
                value={format}
                onChange={setFormatQ}
                allLabel={t("ფორმატი", "Format")}
                options={[
                  { value: "ონლაინ", label: t("ონლაინ", "Online") },
                  { value: "დასწრებით", label: t("დასწრებით", "In person") },
                ]}
                aria-label={t("ფორმატი", "Format")}
              />
              <FilterSelect
                value={city}
                onChange={setCityQ}
                allLabel={t("ქალაქი", "City")}
                options={cities.map((c) => ({ value: c, label: c }))}
                aria-label={t("ქალაქი", "City")}
              />
              <FilterSelect
                value={sort}
                onChange={setSortQ}
                defaultValue="newest"
                options={[
                  { value: "newest", label: t("უახლესი", "Newest") },
                  { value: "date", label: t("თარიღით", "By date") },
                  { value: "points", label: t("ქულით", "By points") },
                  { value: "interested", label: t("პოპულარობით", "By interest") },
                ]}
                aria-label={t("დალაგება", "Sort")}
              />
              {isDoctor && !mineTab && (
                <FilterToggle
                  active={favOnly}
                  onClick={() => setFavOnlyQ(!favOnly)}
                  title={t("რჩეულები", "Favorites")}
                  aria-label={t("რჩეულები", "Favorites")}
                >
                  <Bookmark size={15} filled={favOnly} />
                  <span>{t("რჩეულები", "Favorites")}</span>
                </FilterToggle>
              )}
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
                total={source.length}
                hasFilters={hasFilters}
                label={(shown, total) =>
                  hasFilters
                    ? t(`${shown} / ${total} შედეგი`, `${shown} of ${total} results`)
                    : t(`${total} ტრენინგი`, `${total} trainings`)
                }
              />
            ) : null
          }
        />

        {loading ? (
          <div className="events-feed fb-events" aria-busy="true">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="event-row--skel" />
            ))}
          </div>
        ) : mineTab && mineItems.length === 0 ? (
          <EmptyState
            icon={<Cap size={42} sw={1.6} />}
            title={t("ჯერ არ გაქვს რეგისტრაცია", "No registrations yet")}
            text={t("ტრენინგზე რეგისტრაციის შემდეგ ის აქ გამოჩნდება.", "After you register, it will appear here.")}
            action={
              <button className="btn btn-primary btn-sm" onClick={() => setTab(false)}>
                {t("ტრენინგების ნახვა", "Browse trainings")}
              </button>
            }
          />
        ) : source.length === 0 ? (
          <EmptyState
            icon={<Calendar size={42} sw={1.6} />}
            title={t("ჯერ არ არის ტრენინგები", "No trainings yet")}
            text={t("როგორც კი ცენტრები გამოაქვეყნებენ, აქ დაინახავ.", "Once centers publish, you'll see them here.")}
          />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={<Search size={42} sw={1.6} />}
            title={t("ვერაფერი მოიძებნა", "Nothing found")}
            text={t("შეცვალე ფილტრები ან საძიებო სიტყვა ზედა ძებნაში.", "Try different filters or the top search.")}
            action={
              <button className="btn btn-ghost btn-sm" onClick={clearFilters}>
                {t("გასუფთავება", "Clear")}
              </button>
            }
          />
        ) : (
          <div className="events-feed fb-events">
            {grouped.map(([key, list]) => {
              let feedIndex = 0;
              return (
              <section key={key} className="events-day">
                <h2 className="events-day-title">{sectionTitle(key, list[0])}</h2>
                <div className="events-day-list">
                  {list.flatMap((a) => {
                    const online = a.format === "ონლაინ";
                    const place = placeLabel(a);
                    const going = mineTab || a.isInterested;
                    const parts = dateParts(a.startDate);
                    const bannerUrl = pickCardBanner(a.id, a.imageUrl);
                    const time = fmtTime(a.startDate);
                    const likes = likeCounts[a.id] ?? a.interestedCount;
                    const interestedSoft = a.isFavorite || going;
                    const whenLine = [
                      parts ? `${parts.weekday}` : null,
                      time || null,
                      a.category || null,
                    ].filter(Boolean).join(" · ");

                    const card = (
                      <article
                        key={a.id}
                        className={`fb-event${going ? " is-going" : ""}${a.isFavorite ? " is-liked" : ""}`}
                        onClick={() => setModalId(a.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setModalId(a.id);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                      >
                        <div className="fb-event-cover" aria-hidden="true">
                          <img src={bannerUrl} alt="" loading="lazy" />
                          <div className="fb-event-datechip">
                            {parts ? (
                              <>
                                <span className="fb-event-month">{parts.month}</span>
                                <span className="fb-event-day">{parts.day}</span>
                              </>
                            ) : (
                              <>
                                <span className="fb-event-month">—</span>
                                <span className="fb-event-day"><Calendar size={16} /></span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="fb-event-body">
                          {whenLine && <div className="fb-event-when">{whenLine}</div>}
                          <h3 className="fb-event-title">{a.title}</h3>

                          <div className="fb-event-host">
                            {t("ღონისძიება:", "Event by")}{" "}
                            {a.centerUserId ? (
                              <Link to={`/centers/${a.centerUserId}`} onClick={stopCard}>{a.centerName}</Link>
                            ) : (
                              <span>{a.centerName}</span>
                            )}
                          </div>

                          <div className="fb-event-place">
                            {online ? <Mail size={14} /> : <Pin size={14} />}
                            <span>{place}</span>
                            {a.price > 0 && (
                              <>
                                <span className="fb-event-dot">·</span>
                                <span>{a.price} ₾</span>
                              </>
                            )}
                            {a.points > 0 && (
                              <>
                                <span className="fb-event-dot">·</span>
                                <span>{a.points} {t("ქულა", "pts")}</span>
                              </>
                            )}
                          </div>

                          <div className="fb-event-social">
                            <div className="fb-event-reactions">
                              <span className="fb-like-badge" aria-hidden="true">
                                <ThumbUp size={11} filled />
                              </span>
                              <span>{likes}</span>
                              <span className="fb-event-dot">·</span>
                              <span>
                                {a.interestedCount} {t("მიდის", "going")}
                                {(interestedSoft || a.interestedCount > 0) && (
                                  <> · {t("დაინტერესებული", "interested")}</>
                                )}
                              </span>
                            </div>
                          </div>

                          <div className="fb-event-actions" onClick={stopCard}>
                            {isDoctor && (
                              <button
                                type="button"
                                className={`fb-rsvp${a.isFavorite ? " active like" : ""}`}
                                disabled={busyId === a.id}
                                onClick={() => toggleFav(a)}
                                aria-pressed={a.isFavorite}
                              >
                                <ThumbUp size={16} filled={a.isFavorite} />
                                {t("მომწონს", "Like")}
                              </button>
                            )}
                            {isDoctor && (
                              <button
                                type="button"
                                className={`fb-rsvp${interestedSoft ? " active interested" : ""}`}
                                disabled={busyId === a.id}
                                onClick={() => {
                                  if (going) return;
                                  void toggleFav(a);
                                }}
                                aria-pressed={interestedSoft}
                              >
                                <Star size={16} filled={interestedSoft} />
                                {t("დაინტერესებული", "Interested")}
                              </button>
                            )}
                            {isDoctor && (
                              <button
                                type="button"
                                className={`fb-rsvp${going ? " active going" : ""}`}
                                disabled={busyId === a.id}
                                onClick={() => toggleInterest(a)}
                                aria-pressed={going}
                              >
                                <Check size={16} />
                                {going ? t("მივდივარ", "Going") : t("მივდივარ", "Going")}
                              </button>
                            )}
                            {mineTab && a.hasGroupChat && (
                              <button type="button" className="fb-rsvp" onClick={() => navigate("/chat")}>
                                <Chat size={16} /> {t("ჩატი", "Chat")}
                              </button>
                            )}
                            <ShareMenu
                              title={a.title}
                              className="fb-rsvp"
                              label={t("გაზიარება", "Share")}
                            />
                          </div>
                        </div>
                      </article>
                    );

                    const nodes = [card];
                    feedIndex += 1;
                    /* Insert a Sponsored card every 3 trainings (Facebook feed style). */
                    if (!mineTab && sponsored.length > 0 && feedIndex % 3 === 0) {
                      const ad = sponsored[(Math.floor(feedIndex / 3) - 1) % sponsored.length];
                      nodes.push(
                        <SponsoredEventCard key={`sponsored-${key}-${a.id}-${ad.id}`} item={ad} />
                      );
                    }
                    return nodes;
                  })}
                </div>
              </section>
              );
            })}
          </div>
        )}
      </div>

      {isDoctor && (
        <aside className="announcements-aside">
          <PointsPanel />
        </aside>
      )}

      {modalAnnouncement && (
        <EventDetailModal
          a={modalAnnouncement}
          likes={likeCounts[modalAnnouncement.id] ?? modalAnnouncement.interestedCount}
          isDoctor={isDoctor}
          mineTab={mineTab}
          busyId={busyId}
          whenFull={
            modalAnnouncement.startDate
              ? fmtDateTime(modalAnnouncement.startDate)
              : t("თარიღი მითითებული არ არის", "Date not set")
          }
          placeLabel={placeLabel(modalAnnouncement)}
          dateParts={dateParts(modalAnnouncement.startDate)}
          fmtDate={fmtDate}
          meetingAccess={(mineTab || modalAnnouncement.isInterested)
            ? renderMeetingAccess(modalAnnouncement)
            : null}
          onClose={() => setModalId(null)}
          onStop={stopCard}
          onLike={() => { void toggleFav(modalAnnouncement); }}
          onGoing={() => { void toggleInterest(modalAnnouncement); }}
          onChat={() => navigate("/chat")}
        />
      )}
    </div>
  );
}
