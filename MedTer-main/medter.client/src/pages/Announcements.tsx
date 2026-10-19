import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../api";
import { useAuth } from "../auth";
import { usePrefs } from "../i18n";
import { Calendar, Pin, Search, Check, Bookmark, Cap, Chat, X, ExternalLink, Video } from "../components/icons";
import ShareMenu from "../components/ShareMenu";
import PointsPanel from "../components/PointsPanel";
import EmptyState from "../components/EmptyState";
import AuthRequired from "../components/AuthRequired";
import { useSponsoredCreatives } from "../components/LinearAdBanner";
import SponsoredEventCard from "../components/SponsoredEventCard";
import EventDetailModal from "../components/EventDetailModal";
import { FilterBar, FilterSelect, FilterToggle, FilterChips, ResultMeta, SearchField, type FilterChip } from "../components/FilterBar";
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

type WhenFilter = "upcoming" | "week" | "month" | "past" | "all";

const isHttpUrl = (value: string) => /^https?:\/\//i.test(value.trim());

function dayKey(iso?: string) {
  if (!iso) return "nodate";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "nodate";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function matchesWhen(iso: string | undefined, when: WhenFilter) {
  if (when === "all") return true;
  if (!iso) return when === "upcoming" || when === "week" || when === "month";
  const t = new Date(iso).getTime();
  if (isNaN(t)) return when !== "past";
  const today = startOfDay(new Date());
  if (when === "past") return t < today;
  if (when === "upcoming") return t >= today;
  if (when === "week") {
    const end = today + 7 * 24 * 60 * 60 * 1000;
    return t >= today && t < end;
  }
  if (when === "month") {
    const end = today + 30 * 24 * 60 * 60 * 1000;
    return t >= today && t < end;
  }
  return true;
}

export default function Announcements() {
  const { user } = useAuth();
  if (!user) {
    return (
      <AuthRequired
        titleKa="ტრენინგების სანახავად ანგარიში გჭირდება"
        titleEn="You need an account to view trainings"
        textKa="შექმენი ანგარიში ან შედი — შემდეგ დაინახავ ყველა ტრენინგს."
        textEn="Create an account or sign in — then you'll see all trainings."
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

  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const [category, setCategory] = useState(() => searchParams.get("cat") ?? "");
  const [format, setFormat] = useState(() => searchParams.get("format") ?? "");
  const [city, setCity] = useState(() => searchParams.get("city") ?? "");
  const [sort, setSort] = useState(() => searchParams.get("sort") || "date");
  const [when, setWhen] = useState<WhenFilter>(() => {
    const w = searchParams.get("when");
    if (w === "week" || w === "month" || w === "past" || w === "all" || w === "upcoming") return w;
    // Default: show everything — demo seed dates are often already past.
    return "all";
  });
  const [savedOnly, setSavedOnly] = useState(() => searchParams.get("saved") === "1" || searchParams.get("fav") === "1");

  useEffect(() => {
    setSearch(searchParams.get("q") ?? "");
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
      const drop =
        val === null ||
        val === "" ||
        (key === "sort" && val === "date") ||
        (key === "when" && val === "all") ||
        ((key === "saved" || key === "fav") && val !== "1");
      if (drop) next.delete(key);
      else next.set(key, val);
    }
    next.delete("fav");
    setSearchParams(next, { replace: true });
  };

  const setSearchQ = (v: string) => {
    setSearch(v);
    writeFilterParams({ q: v.trim() || null });
  };
  const setCategoryQ = (v: string) => { setCategory(v); writeFilterParams({ cat: v || null }); };
  const setFormatQ = (v: string) => { setFormat(v); writeFilterParams({ format: v || null }); };
  const setCityQ = (v: string) => { setCity(v); writeFilterParams({ city: v || null }); };
  const setSortQ = (v: string) => { setSort(v); writeFilterParams({ sort: v }); };
  const setWhenQ = (v: WhenFilter) => { setWhen(v); writeFilterParams({ when: v }); };
  const setSavedOnlyQ = (v: boolean) => { setSavedOnly(v); writeFilterParams({ saved: v ? "1" : null }); };

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

  const toggleSaved = async (a: Announcement) => {
    const next = !a.isFavorite;
    patchLists(a.id, { isFavorite: next });
    try {
      if (a.isFavorite) await api.delete(`/announcements/${a.id}/favorite`);
      else await api.post(`/announcements/${a.id}/favorite`);
    } catch {
      patchLists(a.id, { isFavorite: a.isFavorite });
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
      if (!mineTab && savedOnly && !a.isFavorite) return false;
      if (!mineTab && !matchesWhen(a.startDate, when)) return false;
      return true;
    });
    if (sort === "points") list = [...list].sort((a, b) => b.points - a.points);
    else if (sort === "interested") list = [...list].sort((a, b) => b.interestedCount - a.interestedCount);
    else if (when === "past") {
      list = [...list].sort((a, b) => new Date(b.startDate ?? 0).getTime() - new Date(a.startDate ?? 0).getTime() || b.id - a.id);
    } else {
      list = [...list].sort((a, b) => new Date(a.startDate ?? Number.MAX_SAFE_INTEGER).getTime() - new Date(b.startDate ?? Number.MAX_SAFE_INTEGER).getTime() || b.id - a.id);
    }
    return list;
  }, [source, search, category, format, city, savedOnly, sort, when, mineTab]);

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

  const hasFilters = Boolean(search || category || format || city || savedOnly || when !== "all");

  const clearFilters = () => {
    setSearch(""); setCategory(""); setFormat(""); setCity(""); setSavedOnly(false); setWhen("all");
    writeFilterParams({ q: null, cat: null, format: null, city: null, saved: null, when: null });
  };

  const whenLabel = (w: WhenFilter) => {
    if (w === "week") return t("ამ კვირაში", "This week");
    if (w === "month") return t("ამ თვეში", "This month");
    if (w === "past") return t("გასული", "Past");
    if (w === "upcoming") return t("მომავალი", "Upcoming");
    return t("ყველა", "All");
  };

  const activeChips: FilterChip[] = [
    search ? { id: "q", label: `\u201C${search.trim()}\u201D`, onClear: () => setSearchQ("") } : null,
    when !== "all" ? { id: "when", label: whenLabel(when), onClear: () => setWhenQ("all") } : null,
    category ? { id: "cat", label: category, onClear: () => setCategoryQ("") } : null,
    format ? {
      id: "format",
      label: format === "ონლაინ" ? t("ონლაინ", "Online") : t("დასწრებით", "In person"),
      onClear: () => setFormatQ(""),
    } : null,
    city ? { id: "city", label: city, onClear: () => setCityQ("") } : null,
    savedOnly && !mineTab ? { id: "saved", label: t("შენახული", "Saved"), onClear: () => setSavedOnlyQ(false) } : null,
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

  const deadlineSoon = (iso?: string) => {
    if (!iso) return false;
    const t0 = new Date(iso).getTime();
    if (isNaN(t0)) return false;
    const now = Date.now();
    return t0 >= now && t0 - now <= 7 * 24 * 60 * 60 * 1000;
  };

  let feedIndex = 0;

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
            <h1>{mineTab ? t("ჩემი ტრენინგები", "My Trainings") : t("ფიდი", "Feed")}</h1>
            <p>
              {mineTab
                ? t("შენი რეგისტრაციები — თარიღი, ლინკი და დეტალები", "Your registrations — dates, links and details")
                : t("იპოვე ტრენინგი და დარეგისტრირდი", "Find a training and register")}
            </p>
          </div>
        </div>

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

        {!mineTab && (
          <div className="when-chips" role="group" aria-label={t("პერიოდი", "Period")}>
            {(["all", "upcoming", "week", "month", "past"] as WhenFilter[]).map((w) => (
              <button
                key={w}
                type="button"
                className={`when-chip${when === w ? " active" : ""}`}
                onClick={() => setWhenQ(w)}
              >
                {whenLabel(w)}
              </button>
            ))}
          </div>
        )}

        <FilterBar
          collapsible
          filtersLabel={t("ფილტრები", "Filters")}
          activeCount={activeChips.filter((c) => c.id !== "q" && c.id !== "when").length + (sort !== "date" ? 1 : 0)}
          search={
            <SearchField
              value={search}
              onChange={setSearchQ}
              placeholder={t("ძებნა ტრენინგებში…", "Search trainings…")}
              aria-label={t("ძებნა", "Search")}
            />
          }
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
                defaultValue="date"
                options={[
                  { value: "date", label: t("თარიღით", "By date") },
                  { value: "points", label: t("ქულით", "By points") },
                  { value: "interested", label: t("პოპულარობით", "By popularity") },
                ]}
                aria-label={t("დალაგება", "Sort")}
              />
              {isDoctor && !mineTab && (
                <FilterToggle
                  active={savedOnly}
                  onClick={() => setSavedOnlyQ(!savedOnly)}
                  title={t("შენახული", "Saved")}
                  aria-label={t("შენახული", "Saved")}
                >
                  <Bookmark size={15} filled={savedOnly} />
                  <span>{t("შენახული", "Saved")}</span>
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
            text={
              when !== "all" && source.length > 0
                ? t("ამ პერიოდში ტრენინგი არ არის — სცადე ყველა.", "No trainings in this period — try All.")
                : t("შეცვალე ფილტრები ან პერიოდი.", "Try different filters or period.")
            }
            action={
              when !== "all" && source.length > 0 ? (
                <button className="btn btn-primary btn-sm" onClick={() => setWhenQ("all")}>
                  {t("ყველას ნახვა", "Show all")}
                </button>
              ) : (
                <button className="btn btn-ghost btn-sm" onClick={clearFilters}>
                  {t("გასუფთავება", "Clear")}
                </button>
              )
            }
          />
        ) : (
          <div className="events-feed fb-events">
            {grouped.map(([key, list]) => (
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
                    const whenLine = [
                      parts ? `${parts.weekday}` : null,
                      time || null,
                      a.category || null,
                    ].filter(Boolean).join(" · ");
                    const showDeadline = a.registrationDeadline && !going && deadlineSoon(a.registrationDeadline);

                    const card = (
                      <article
                        key={a.id}
                        className={`fb-event${going ? " is-going" : ""}${a.isFavorite ? " is-saved" : ""}`}
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
                            {t("ორგანიზატორი:", "Hosted by")}{" "}
                            {a.centerUserId ? (
                              <Link to={`/centers/${a.centerUserId}`} onClick={stopCard}>{a.centerName}</Link>
                            ) : (
                              <span>{a.centerName}</span>
                            )}
                          </div>

                          <div className="fb-event-place">
                            {online ? <Video size={14} /> : <Pin size={14} />}
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
                            {typeof a.seats === "number" && a.seats > 0 && !going && (
                              <>
                                <span className="fb-event-dot">·</span>
                                <span>{a.seats} {t("ადგილი", "seats")}</span>
                              </>
                            )}
                          </div>

                          {showDeadline && (
                            <div className="fb-event-deadline">
                              {t("რეგისტრაციის ვადა:", "Register by:")} {fmtDate(a.registrationDeadline)}
                            </div>
                          )}

                          {(going || a.interestedCount > 0) && (
                            <div className="fb-event-social">
                              <span>
                                {a.interestedCount} {t("მიდის", "going")}
                              </span>
                            </div>
                          )}

                          {going && (a.meetingAccess || a.city) && (
                            <div className="fb-event-access" onClick={stopCard}>
                              {renderMeetingAccess(a)}
                            </div>
                          )}

                          <div className="fb-event-actions" onClick={stopCard}>
                            {isDoctor && (
                              <button
                                type="button"
                                className={`fb-rsvp fb-rsvp-primary${going ? " active going" : ""}`}
                                disabled={busyId === a.id}
                                onClick={() => toggleInterest(a)}
                                aria-pressed={going}
                              >
                                <Check size={16} />
                                {going ? t("რეგისტრირებული", "Registered") : t("რეგისტრაცია", "Register")}
                              </button>
                            )}
                            {isDoctor && (
                              <button
                                type="button"
                                className={`fb-rsvp${a.isFavorite ? " active saved" : ""}`}
                                disabled={busyId === a.id}
                                onClick={() => toggleSaved(a)}
                                aria-pressed={a.isFavorite}
                              >
                                <Bookmark size={16} filled={a.isFavorite} />
                                {a.isFavorite ? t("შენახული", "Saved") : t("შენახვა", "Save")}
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
                    if (!mineTab && sponsored.length > 0 && feedIndex % 5 === 0) {
                      const ad = sponsored[(Math.floor(feedIndex / 5) - 1) % sponsored.length];
                      nodes.push(
                        <SponsoredEventCard key={`sponsored-${key}-${a.id}-${ad.id}`} item={ad} />
                      );
                    }
                    return nodes;
                  })}
                </div>
              </section>
            ))}
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
          onSave={() => { void toggleSaved(modalAnnouncement); }}
          onGoing={() => { void toggleInterest(modalAnnouncement); }}
          onChat={() => navigate("/chat")}
        />
      )}
    </div>
  );
}
