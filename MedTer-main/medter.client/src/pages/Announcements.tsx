import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../api";
import { useAuth } from "../auth";
import { usePrefs } from "../i18n";
import { Calendar, Pin, Mail, Search, Check, Bookmark, Cap, Chat, X, ExternalLink } from "../components/icons";
import ShareMenu from "../components/ShareMenu";
import PointsPanel from "../components/PointsPanel";
import MediaPlaceholder from "../components/MediaPlaceholder";
import EmptyState from "../components/EmptyState";
import { SkeletonGrid } from "../components/Skeleton";
import LinearAdBanner from "../components/LinearAdBanner";
import { FilterBar, SearchField, FilterSelect, FilterToggle, FilterChips, ResultMeta, type FilterChip } from "../components/FilterBar";
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

type Flash = {
  kind: "ok" | "err";
  text: string;
  actionMine?: boolean;
  meetingAccess?: string;
  meetingCity?: string;
  meetingFormat?: string;
};

const isHttpUrl = (value: string) => /^https?:\/\//i.test(value.trim());

export default function Announcements() {
  const { user } = useAuth();
  const { t, lang } = usePrefs();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isDoctor = user?.role === "Doctor";
  const mineTab = isDoctor && searchParams.get("mine") === "1";
  const justRegistered = searchParams.get("welcome") === "1";

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
  const [sort, setSort] = useState(() => searchParams.get("sort") || "newest");
  const [favOnly, setFavOnly] = useState(() => searchParams.get("fav") === "1");

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
      if (val === null || val === "" || (key === "sort" && val === "newest") || (key === "fav" && val !== "1")) {
        next.delete(key);
      } else {
        next.set(key, val);
      }
    }
    setSearchParams(next, { replace: true });
  };

  const setSearchQ = (v: string) => { setSearch(v); writeFilterParams({ q: v || null }); };
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
    patchLists(a.id, { isFavorite: !a.isFavorite });
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
      if (!mineTab && favOnly && !a.isFavorite) return false;
      return true;
    });
    if (sort === "date") list = [...list].sort((a, b) => new Date(a.startDate ?? 0).getTime() - new Date(b.startDate ?? 0).getTime());
    else if (sort === "points") list = [...list].sort((a, b) => b.points - a.points);
    else if (sort === "interested") list = [...list].sort((a, b) => b.interestedCount - a.interestedCount);
    return list;
  }, [source, search, category, format, city, favOnly, sort, mineTab]);

  const hasFilters = Boolean(search || category || format || city || favOnly);

  const clearFilters = () => {
    setSearch(""); setCategory(""); setFormat(""); setCity(""); setFavOnly(false);
    writeFilterParams({ q: null, cat: null, format: null, city: null, fav: null });
  };

  const activeChips: FilterChip[] = [
    search ? { id: "q", label: `\u201C${search.trim()}\u201D`, onClear: () => setSearchQ("") } : null,
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

        <div className="page-head">
          <div className="h-text">
            <h1>{mineTab ? t("ჩემი ტრენინგები", "My Trainings") : t("ტრენინგები", "Trainings")}</h1>
            <p>
              {mineTab
                ? t("შენი რეგისტრაციები — თარიღი და დეტალები", "Your registrations — dates and details")
                : t("დაათვალიერე და დაარეგისტრირდი", "Browse and register")}
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
          search={
            <SearchField
              value={search}
              onChange={setSearchQ}
              placeholder={t("ძებნა სათაურით, ცენტრით, ქალაქით…", "Search by title, center, city…")}
              aria-label={t("ტრენინგების ძებნა", "Search trainings")}
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
          <SkeletonGrid count={6} />
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
            text={t("შეცვალე ფილტრები ან საძიებო სიტყვა.", "Try different filters or search terms.")}
            action={
              <button className="btn btn-ghost btn-sm" onClick={clearFilters}>
                {t("გასუფთავება", "Clear")}
              </button>
            }
          />
        ) : (
          <div className="grid">
            {visible.map((a, i) => {
              const online = a.format === "ონლაინ";
              const place = placeLabel(a);
              const registered = mineTab || a.isInterested;

              const bannerUrl = pickCardBanner(a.id, a.imageUrl);

              return (
                <article
                  key={a.id}
                  className={`card card--banner card-interactive reveal${a.isInterested ? " card-pulse" : ""}`}
                  style={{ animationDelay: `${Math.min(i, 8) * 40}ms`, cursor: "pointer" }}
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
                  <div className="card-banner-bg" aria-hidden="true">
                    <img src={bannerUrl} alt="" loading="lazy" />
                  </div>

                  {registered && (
                    <span className="badge-registered" title={t("დარეგისტრირებული", "Registered")}>
                      <Check size={14} />
                    </span>
                  )}
                  {isDoctor && !mineTab && (
                    <button
                      type="button"
                      className={`act card-banner-fav${registered ? " has-registered" : ""}`}
                      title={t("რჩეულები", "Favorites")}
                      style={{ color: a.isFavorite ? "var(--brand)" : "var(--muted)" }}
                      onClick={(e) => { stopCard(e); toggleFav(a); }}
                    >
                      <Bookmark size={16} filled={a.isFavorite} />
                    </button>
                  )}

                  <div className="body">
                    {a.points > 0 && (
                      <span className="badge-points">
                        <span className="tealdot" /> {a.points} {t("ქულა", "pts")}
                      </span>
                    )}
                    {a.category && <span className="chip-cat">{a.category}</span>}
                    <h3>{a.title}</h3>
                    <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.82)", marginTop: -4 }}>
                      {a.centerUserId
                        ? (
                          <Link
                            to={`/centers/${a.centerUserId}`}
                            style={{ color: "inherit", textDecoration: "underline", textUnderlineOffset: 2 }}
                            onClick={stopCard}
                          >
                            {a.centerName}
                          </Link>
                        )
                        : a.centerName}
                    </div>

                    <div className="meta">
                      {a.startDate && (
                        <div className="row">
                          <Calendar size={15} /> {mineTab ? fmtDateTime(a.startDate) : fmtDate(a.startDate)}
                        </div>
                      )}
                      <div className="row">
                        {online ? <Mail size={15} /> : <Pin size={15} />}
                        {place}
                      </div>
                    </div>

                    <div className="foot" onClick={stopCard}>
                      {a.price > 0 ? (
                        <span style={{ fontSize: 13.5, fontWeight: 700 }}>
                          {a.price} ₾
                        </span>
                      ) : (
                        <span />
                      )}
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {mineTab ? (
                          <>
                            {a.hasGroupChat && (
                              <button type="button" className="btn btn-primary btn-sm" onClick={() => navigate("/chat")}>
                                <Chat size={14} />
                              </button>
                            )}
                          </>
                        ) : (
                          <>
                            <ShareMenu title={a.title} />
                            {isDoctor && !a.isInterested && (
                              <button
                                className="btn btn-primary btn-sm"
                                disabled={busyId === a.id}
                                onClick={() => toggleInterest(a)}
                              >
                                {busyId === a.id ? "..." : t("რეგისტრაცია", "Register")}
                              </button>
                            )}
                            {isDoctor && a.isInterested && (
                              <span className="reg-inline">
                                <Check size={14} /> {t("დარეგისტრირებული", "Registered")}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
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
        <div className="modal" onClick={() => setModalId(null)}>
          <div className="box train-detail-modal" onClick={stopCard}>
            <div className="mhead">
              <div>
                <h3>{modalAnnouncement.title}</h3>
                <p>
                  {modalAnnouncement.centerUserId
                    ? (
                      <Link to={`/centers/${modalAnnouncement.centerUserId}`} onClick={() => setModalId(null)}>
                        {modalAnnouncement.centerName}
                      </Link>
                    )
                    : modalAnnouncement.centerName}
                </p>
              </div>
              <button type="button" className="xbtn" aria-label={t("დახურვა", "Close")} onClick={() => setModalId(null)}>×</button>
            </div>

            <div className="train-detail-media">
              {modalAnnouncement.imageUrl
                ? <img src={modalAnnouncement.imageUrl} alt="" />
                : <MediaPlaceholder title={modalAnnouncement.title} subtitle={modalAnnouncement.centerName} variant={modalAnnouncement.points > 0 ? "teal" : "navy"} />}
            </div>

            <div className="meta" style={{ marginBottom: 12 }}>
              {modalAnnouncement.startDate && (
                <div className="row">
                  <Calendar size={15} /> {fmtDateTime(modalAnnouncement.startDate)}
                </div>
              )}
              <div className="row">
                {modalAnnouncement.format === "ონლაინ" ? <Mail size={15} /> : <Pin size={15} />}
                {placeLabel(modalAnnouncement)}
              </div>
            </div>

            {(modalAnnouncement.description || modalAnnouncement.shortDescription) && (
              <p className="train-detail-desc">{modalAnnouncement.description || modalAnnouncement.shortDescription}</p>
            )}

            <div className="train-details-grid">
              {modalAnnouncement.price > 0 && (
                <div>
                  <span>{t("ფასი", "Price")}</span>
                  <b>{modalAnnouncement.price} ₾</b>
                </div>
              )}
              {modalAnnouncement.duration && (
                <div>
                  <span>{t("ხანგრძლივობა", "Duration")}</span>
                  <b>{modalAnnouncement.duration}</b>
                </div>
              )}
              {modalAnnouncement.language && (
                <div>
                  <span>{t("ენა", "Language")}</span>
                  <b>{modalAnnouncement.language}</b>
                </div>
              )}
              {modalAnnouncement.registrationDeadline && (
                <div>
                  <span>{t("ვადა", "Deadline")}</span>
                  <b>{fmtDate(modalAnnouncement.registrationDeadline)}</b>
                </div>
              )}
            </div>

            {(mineTab || modalAnnouncement.isInterested) && renderMeetingAccess(modalAnnouncement)}

            <div className="train-detail-footer">
              {mineTab && modalAnnouncement.hasGroupChat && (
                <button type="button" className="btn btn-primary btn-sm" onClick={() => navigate("/chat")}>
                  <Chat size={14} /> {t("ჩატი", "Chat")}
                </button>
              )}
              {isDoctor && (mineTab || modalAnnouncement.isInterested) && (
                <button
                  type="button"
                  className="btn btn-text btn-sm"
                  style={{ color: "var(--danger)" }}
                  disabled={busyId === modalAnnouncement.id}
                  onClick={() => toggleInterest(modalAnnouncement)}
                >
                  {busyId === modalAnnouncement.id ? "..." : t("რეგისტრაციის გაუქმება", "Cancel registration")}
                </button>
              )}
              {isDoctor && !modalAnnouncement.isInterested && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={busyId === modalAnnouncement.id}
                  onClick={() => toggleInterest(modalAnnouncement)}
                >
                  {busyId === modalAnnouncement.id ? "..." : t("რეგისტრაცია", "Register")}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
