import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../api";
import { useAuth } from "../auth";
import { usePrefs } from "../i18n";
import { Calendar, Pin, Mail, Search, Check, Bookmark, Cap, Chat, X } from "../components/icons";
import ShareMenu from "../components/ShareMenu";
import PointsPanel from "../components/PointsPanel";
import MediaPlaceholder from "../components/MediaPlaceholder";
import EmptyState from "../components/EmptyState";
import { SkeletonGrid } from "../components/Skeleton";

interface Announcement {
  id: number;
  title: string;
  type?: string;
  category?: string;
  format?: string;
  shortDescription?: string;
  description?: string;
  city?: string;
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

const MONTHS_KA = ["იანვარი", "თებერვალი", "მარტი", "აპრილი", "მაისი", "ივნისი", "ივლისი", "აგვისტო", "სექტემბერი", "ოქტომბერი", "ნოემბერი", "დეკემბერი"];
const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

type Flash = { kind: "ok" | "err"; text: string; actionMine?: boolean };

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
  const [expanded, setExpanded] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [flash, setFlash] = useState<Flash | null>(null);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [format, setFormat] = useState("");
  const [city, setCity] = useState("");
  const [sort, setSort] = useState("newest");
  const [favOnly, setFavOnly] = useState(false);

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

  const setTab = (mine: boolean) => {
    setExpanded(null);
    if (mine) setSearchParams({ mine: "1" });
    else setSearchParams({});
  };

  const patchLists = (id: number, patch: Partial<Announcement>) => {
    const apply = (list: Announcement[]) => list.map((a) => (a.id === id ? { ...a, ...patch } : a));
    setItems((prev) => apply(prev));
    setMineItems((prev) => apply(prev));
  };

  const toggleInterest = async (a: Announcement) => {
    if (busyId === a.id) return;
    setBusyId(a.id);
    const nextInterested = !a.isInterested;
    const nextCount = Math.max(0, a.interestedCount + (nextInterested ? 1 : -1));
    patchLists(a.id, { isInterested: nextInterested, interestedCount: nextCount });

    try {
      if (a.isInterested) await api.delete(`/announcements/${a.id}/interest`);
      else await api.post(`/announcements/${a.id}/interest`);

      if (nextInterested) {
        setMineItems((prev) => {
          if (prev.some((x) => x.id === a.id)) {
            return prev.map((x) => (x.id === a.id ? { ...x, isInterested: true, interestedCount: nextCount } : x));
          }
          return [{ ...a, isInterested: true, interestedCount: nextCount }, ...prev];
        });
        setFlash({
          kind: "ok",
          text: t(`დარეგისტრირდი: ${a.title}`, `Registered: ${a.title}`),
          actionMine: true,
        });
      } else {
        setMineItems((prev) => prev.filter((x) => x.id !== a.id));
        setFlash({ kind: "ok", text: t("რეგისტრაცია გაუქმდა", "Registration cancelled") });
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

  const registeredCount = mineItems.length;
  const source = mineTab ? mineItems : items;

  const categories = useMemo(() => [...new Set(source.map((a) => a.category).filter(Boolean))] as string[], [source]);
  const cities = useMemo(() => [...new Set(source.map((a) => a.city).filter(Boolean))] as string[], [source]);

  const visible = useMemo(() => {
    let list = source.filter((a) => {
      if (search && !a.title.toLowerCase().includes(search.toLowerCase())) return false;
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

  const clearFilters = () => {
    setSearch(""); setCategory(""); setFormat(""); setCity(""); setFavOnly(false);
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

        <div className="toolbar">
          <div className="search" style={{ marginLeft: 0, maxWidth: 280 }}>
            <Search size={16} />
            <input placeholder={t("ძებნა…", "Search…")} value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="control" style={{ width: "auto" }} value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">{t("კატეგორია", "Category")}</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="control" style={{ width: "auto" }} value={format} onChange={(e) => setFormat(e.target.value)}>
            <option value="">{t("ფორმატი", "Format")}</option>
            <option value="ონლაინ">{t("ონლაინ", "Online")}</option>
            <option value="დასწრებით">{t("დასწრებით", "In person")}</option>
          </select>
          <select className="control" style={{ width: "auto" }} value={city} onChange={(e) => setCity(e.target.value)}>
            <option value="">{t("ქალაქი", "City")}</option>
            {cities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="control" style={{ width: "auto" }} value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="newest">{t("უახლესი", "Newest")}</option>
            <option value="date">{t("თარიღით", "By date")}</option>
            <option value="points">{t("ქულით", "By points")}</option>
          </select>
          {isDoctor && !mineTab && (
            <button
              type="button"
              className={`select-mini ${favOnly ? "active" : ""}`}
              style={favOnly ? { borderColor: "var(--brand)", color: "var(--brand)" } : undefined}
              onClick={() => setFavOnly((v) => !v)}
            >
              <Bookmark size={15} filled={favOnly} />
            </button>
          )}
          {(search || category || format || city || favOnly) && (
            <button type="button" className="btn btn-text btn-sm" onClick={clearFilters}>
              {t("გასუფთავება", "Clear")}
            </button>
          )}
        </div>

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
              const open = expanded === a.id;
              const online = a.format === "ონლაინ";
              const place = online
                ? t("ონლაინ", "Online")
                : (a.city || t("დასწრებით", "In person"));
              const priceLabel = a.price > 0 ? `${a.price} ₾` : t("უფასო", "Free");

              return (
                <article
                  key={a.id}
                  className={`card card-interactive reveal${a.isInterested ? " card-pulse" : ""}`}
                  style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                >
                  <div className="media">
                    {a.imageUrl
                      ? <img src={a.imageUrl} alt="" />
                      : <MediaPlaceholder title={a.title} subtitle={a.centerName} variant={a.points > 0 ? "teal" : "navy"} />}
                    {a.points > 0 && (
                      <span className="badge-points">
                        <span className="tealdot" /> {a.points} {t("ქულა", "pts")}
                      </span>
                    )}
                    {(mineTab || a.isInterested) && (
                      <span className="trust-chip trust-chip--ok" style={{ position: "absolute", top: 10, right: 10, zIndex: 2 }}>
                        <Check size={12} /> {t("დარეგისტრირებული", "Registered")}
                      </span>
                    )}
                    {isDoctor && !mineTab && (
                      <button
                        className="act"
                        title={t("რჩეულები", "Favorites")}
                        style={{
                          position: "absolute",
                          bottom: 8,
                          right: 8,
                          background: "rgba(255,255,255,.92)",
                          color: a.isFavorite ? "var(--brand)" : "var(--muted)",
                        }}
                        onClick={() => toggleFav(a)}
                      >
                        <Bookmark size={16} filled={a.isFavorite} />
                      </button>
                    )}
                  </div>

                  <div className="body">
                    {a.category && <span className="chip-cat">{a.category}</span>}
                    <h3>{a.title}</h3>
                    <div style={{ fontSize: 12.5, color: "var(--soft)", marginTop: -4 }}>
                      {a.centerUserId
                        ? <Link to={`/centers/${a.centerUserId}`} style={{ color: "inherit", textDecoration: "underline", textUnderlineOffset: 2 }}>{a.centerName}</Link>
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

                    {mineTab && open && (
                      <div className="train-details">
                        {(a.description || a.shortDescription) && (
                          <p>{a.description || a.shortDescription}</p>
                        )}
                        <div className="train-details-grid">
                          <div>
                            <span>{t("ფასი", "Price")}</span>
                            <b>{priceLabel}</b>
                          </div>
                          {a.duration && (
                            <div>
                              <span>{t("ხანგრძლივობა", "Duration")}</span>
                              <b>{a.duration}</b>
                            </div>
                          )}
                          {a.language && (
                            <div>
                              <span>{t("ენა", "Language")}</span>
                              <b>{a.language}</b>
                            </div>
                          )}
                          {a.registrationDeadline && (
                            <div>
                              <span>{t("ვადა", "Deadline")}</span>
                              <b>{fmtDate(a.registrationDeadline)}</b>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="foot">
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: a.price > 0 ? "var(--text)" : "var(--success)" }}>
                        {priceLabel}
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {mineTab ? (
                          <>
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setExpanded(open ? null : a.id)}>
                              {open ? t("ნაკლები", "Less") : t("დეტალები", "Details")}
                            </button>
                            {a.hasGroupChat && (
                              <button type="button" className="btn btn-primary btn-sm" onClick={() => navigate("/chat")}>
                                <Chat size={14} />
                              </button>
                            )}
                            <button
                              type="button"
                              className="btn btn-text btn-sm"
                              style={{ color: "var(--danger)" }}
                              disabled={busyId === a.id}
                              onClick={() => toggleInterest(a)}
                            >
                              {busyId === a.id ? "..." : t("გაუქმება", "Leave")}
                            </button>
                          </>
                        ) : (
                          <>
                            <ShareMenu title={a.title} />
                            {isDoctor && (
                              a.isInterested
                                ? (
                                  <button className="pill-interest on" disabled={busyId === a.id} onClick={() => toggleInterest(a)}>
                                    <Check size={14} /> {busyId === a.id ? "..." : t("დარეგისტრირებული", "Registered")}
                                  </button>
                                )
                                : (
                                  <button className="btn btn-primary btn-sm" disabled={busyId === a.id} onClick={() => toggleInterest(a)}>
                                    {busyId === a.id ? "..." : t("რეგისტრაცია", "Register")}
                                  </button>
                                )
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
    </div>
  );
}
