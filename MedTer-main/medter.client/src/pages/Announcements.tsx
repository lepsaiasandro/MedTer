import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../api";
import { useAuth } from "../auth";
import { usePrefs } from "../i18n";
import { Calendar, Pin, Mail, Search, Check, Bookmark, Cap, Clock, Chat, X, Funnel } from "../components/icons";
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
  const [price, setPrice] = useState("");
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
          if (prev.some((x) => x.id === a.id)) return prev.map((x) => (x.id === a.id ? { ...x, isInterested: true, interestedCount: nextCount } : x));
          return [{ ...a, isInterested: true, interestedCount: nextCount }, ...prev];
        });
        setFlash({
          kind: "ok",
          text: t(`დარეგისტრირდი: ${a.title}`, `Registered: ${a.title}`),
          actionMine: true,
        });
      } else {
        setMineItems((prev) => prev.filter((x) => x.id !== a.id));
        setFlash({
          kind: "ok",
          text: t("რეგისტრაცია გაუქმდა", "Registration cancelled"),
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
      if (price === "free" && a.price > 0) return false;
      if (price === "paid" && a.price === 0) return false;
      if (!mineTab && favOnly && !a.isFavorite) return false;
      return true;
    });
    if (sort === "date") list = [...list].sort((a, b) => new Date(a.startDate ?? 0).getTime() - new Date(b.startDate ?? 0).getTime());
    else if (sort === "points") list = [...list].sort((a, b) => b.points - a.points);
    else if (sort === "interested") list = [...list].sort((a, b) => b.interestedCount - a.interestedCount);
    return list;
  }, [source, search, category, format, city, price, favOnly, sort, mineTab]);

  const clearFilters = () => {
    setSearch(""); setCategory(""); setFormat(""); setCity(""); setPrice(""); setFavOnly(false);
  };

  const filtersActive = !!(search || category || format || city || price || favOnly);

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
                  {t("ჩემი ტრენინგების ნახვა", "View my trainings")}
                </button>
              )}
            </div>
            <button type="button" className="act" aria-label="Close" onClick={() => setFlash(null)}>
              <X size={16} />
            </button>
          </div>
        )}

        <header className="train-hero">
          <div className="train-hero-copy">
            <p className="train-kicker">{t("კატალოგი", "Catalog")}</p>
            <h1>{mineTab ? t("ჩემი ტრენინგები", "My Trainings") : t("ტრენინგები", "Trainings")}</h1>
            <p>
              {mineTab
                ? t(
                    "ტრენინგები, რომლებზეც დარეგისტრირებული ხარ — თარიღი, ადგილი და სხვა დეტალები",
                    "Trainings you are registered for — date, place and other details"
                  )
                : t("დაათვალიერე კონფერენციები და ტრენინგები, დაარეგისტრირდი", "Browse conferences and trainings, register")}
            </p>
          </div>
          {!loading && (
            <div className="train-hero-stat" aria-live="polite">
              <strong>{visible.length}</strong>
              <span>{mineTab ? t("რეგისტრაცია", "registrations") : t("განცხადება", "listings")}</span>
            </div>
          )}
        </header>

        {isDoctor && (
          <div className="segment train-tabs">
            <button type="button" className={!mineTab ? "active" : ""} onClick={() => setTab(false)}>
              {t("ყველა", "All")}
            </button>
            <button type="button" className={mineTab ? "active" : ""} onClick={() => setTab(true)}>
              {t("ჩემი ტრენინგები", "My Trainings")}
              <span className="count">{registeredCount}</span>
            </button>
          </div>
        )}

        <div className="train-filters">
          <div className="train-filters-label">
            <Funnel size={15} />
            <span>{t("ფილტრები", "Filters")}</span>
            {filtersActive && (
              <button type="button" className="btn btn-text btn-sm" onClick={clearFilters}>
                {t("გასუფთავება", "Clear")}
              </button>
            )}
          </div>
          <div className="toolbar train-toolbar">
            <select className="control" style={{ width: "auto" }} value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">{t("ყველა კატეგორია", "All categories")}</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="control" style={{ width: "auto" }} value={format} onChange={(e) => setFormat(e.target.value)}>
              <option value="">{t("ყველა ფორმატი", "All formats")}</option>
              <option value="ონლაინ">{t("ონლაინ", "Online")}</option>
              <option value="დასწრებით">{t("დასწრებით", "In person")}</option>
            </select>
            <select className="control" style={{ width: "auto" }} value={city} onChange={(e) => setCity(e.target.value)}>
              <option value="">{t("ყველა ქალაქი", "All cities")}</option>
              {cities.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="control" style={{ width: "auto" }} value={price} onChange={(e) => setPrice(e.target.value)}>
              <option value="">{t("ფასი: ყველა", "Price: all")}</option>
              <option value="free">{t("უფასო", "Free")}</option>
              <option value="paid">{t("ფასიანი", "Paid")}</option>
            </select>
            <select className="control" style={{ width: "auto" }} value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="newest">{t("უახლესი", "Newest")}</option>
              <option value="date">{t("თარიღით", "By date")}</option>
              <option value="points">{t("ქულით", "By points")}</option>
              <option value="interested">{t("პოპულარობით", "By popularity")}</option>
            </select>
            {isDoctor && !mineTab && (
              <button className={`select-mini ${favOnly ? "active" : ""}`} style={favOnly ? { borderColor: "var(--brand)", color: "var(--brand)" } : undefined} onClick={() => setFavOnly((v) => !v)}>
                <Bookmark size={15} filled={favOnly} /> {t("რჩეულები", "Favorites")}
              </button>
            )}
            <div className="search">
              <Search size={16} />
              <input placeholder={t("ძებნა სათაურით…", "Search by title…")} value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        </div>

        {loading ? (
          <SkeletonGrid count={6} />
        ) : mineTab && mineItems.length === 0 ? (
          <EmptyState
            icon={<Cap size={42} sw={1.6} />}
            title={t("ჯერ არ გაქვს რეგისტრაცია", "No registrations yet")}
            text={t(
              "ტრენინგზე რეგისტრაციის შემდეგ ის აქ გამოჩნდება სრული ინფორმაციით.",
              "After you register for a training, it will appear here with full details."
            )}
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
            text={t("როგორც კი ტრენინგ ცენტრები გამოაქვეყნებენ განცხადებებს, აქ დაინახავ.", "Once training centers publish announcements, you'll see them here.")}
          />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={<Search size={42} sw={1.6} />}
            title={t("ვერაფერი მოიძებნა", "Nothing found")}
            text={t("შეცვალე ფილტრები ან საძიებო სიტყვა.", "Try different filters or search terms.")}
            action={
              <button className="btn btn-ghost btn-sm" onClick={clearFilters}>
                {t("ფილტრის გასუფთავება", "Clear filters")}
              </button>
            }
          />
        ) : (
          <div className="train-grid">
            {visible.map((a, i) => {
              const open = expanded === a.id;
              const blurb = a.shortDescription || a.description;
              const online = a.format === "ონლაინ";
              const priceLabel = a.price > 0 ? `${a.price} ₾` : t("უფასო", "Free");
              return (
                <article
                  key={a.id}
                  className={`train-card reveal${a.isInterested ? " train-card--mine" : ""}`}
                  style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                >
                  <div className="train-card-media">
                    {a.imageUrl
                      ? <img src={a.imageUrl} alt="" />
                      : <MediaPlaceholder title={a.title} subtitle={a.centerName} variant={a.points > 0 ? "teal" : "navy"} />}
                    <div className="train-card-badges">
                      {a.points > 0 && (
                        <span className="train-pill train-pill--pts">
                          <span className="tealdot" /> {a.points} {t("ქულა", "pts")}
                        </span>
                      )}
                      {mineTab || a.isInterested ? (
                        <span className="train-pill train-pill--ok">
                          <Check size={12} /> {t("დარეგისტრირებული", "Registered")}
                        </span>
                      ) : a.points > 0 ? (
                        <span className="train-pill train-pill--cpd">{t("უსდ", "CPD")}</span>
                      ) : null}
                    </div>
                    {isDoctor && !mineTab && (
                      <button
                        className="train-fav"
                        title={t("რჩეულებში დამატება", "Add to favorites")}
                        onClick={() => toggleFav(a)}
                      >
                        <Bookmark size={16} filled={a.isFavorite} />
                      </button>
                    )}
                  </div>

                  <div className="train-card-body">
                    <div className="train-card-tags">
                      {a.category && <span className="chip-cat">{a.category}</span>}
                      <span className={`train-format ${online ? "is-online" : ""}`}>
                        {online ? t("ონლაინ", "Online") : t("დასწრებით", "In person")}
                      </span>
                    </div>

                    <h3>{a.title}</h3>
                    <div className="train-center">
                      {a.centerUserId
                        ? <Link to={`/centers/${a.centerUserId}`}>{a.centerName}</Link>
                        : a.centerName}
                    </div>

                    {!mineTab && blurb && (
                      <p className="train-blurb">{blurb}</p>
                    )}

                    <div className="meta">
                      {a.startDate && (
                        <div className="row">
                          <Calendar size={15} /> {mineTab ? fmtDateTime(a.startDate) : fmtDate(a.startDate)}
                        </div>
                      )}
                      <div className="row">
                        {online ? <Mail size={15} /> : <Pin size={15} />}
                        {online
                          ? t("ონლაინ კურსი", "Online course")
                          : `${a.city ? a.city + " · " : ""}${t("დასწრებით", "In person")}`}
                      </div>
                      {(mineTab || open) && a.duration && (
                        <div className="row"><Clock size={15} /> {a.duration}</div>
                      )}
                      {mineTab && a.registrationDeadline && (
                        <div className="row">
                          <Cap size={15} /> {t("რეგისტრაციის ვადა", "Registration deadline")}: {fmtDate(a.registrationDeadline)}
                        </div>
                      )}
                    </div>

                    {mineTab && blurb && !open && (
                      <p className="train-blurb">{blurb}</p>
                    )}

                    {mineTab && open && (
                      <div className="train-details">
                        {(a.shortDescription || a.description) && (
                          <p>{a.description || a.shortDescription}</p>
                        )}
                        <div className="train-details-grid">
                          {a.language && (
                            <div>
                              <span>{t("ენა", "Language")}</span>
                              <b>{a.language}</b>
                            </div>
                          )}
                          <div>
                            <span>{t("ფასი", "Price")}</span>
                            <b>{priceLabel}</b>
                          </div>
                          {a.seats != null && a.seats > 0 && (
                            <div>
                              <span>{t("ადგილები", "Seats")}</span>
                              <b>{a.interestedCount}/{a.seats}</b>
                            </div>
                          )}
                          {a.type && (
                            <div>
                              <span>{t("ტიპი", "Type")}</span>
                              <b>{a.type}</b>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="train-card-foot">
                      <div className="train-price-row">
                        <strong className={a.price > 0 ? "" : "is-free"}>{priceLabel}</strong>
                        <span>{a.interestedCount} {t("დაინტერესდა", "interested")}</span>
                      </div>

                      {mineTab ? (
                        <div className="train-card-actions">
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setExpanded(open ? null : a.id)}>
                            {open ? t("შემოკლება", "Show less") : t("დეტალები", "Details")}
                          </button>
                          {a.hasGroupChat && (
                            <button type="button" className="btn btn-primary btn-sm" onClick={() => navigate("/chat")}>
                              <Chat size={14} /> {t("ჯგუფის ჩატი", "Group chat")}
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{ color: "var(--danger)" }}
                            disabled={busyId === a.id}
                            onClick={() => toggleInterest(a)}
                          >
                            {busyId === a.id ? "..." : t("გაუქმება", "Leave")}
                          </button>
                        </div>
                      ) : (
                        <div className="train-card-actions">
                          <ShareMenu title={a.title} />
                          {isDoctor && (
                            a.isInterested
                              ? (
                                <button
                                  className="pill-interest on"
                                  disabled={busyId === a.id}
                                  onClick={() => toggleInterest(a)}
                                >
                                  <Check size={14} /> {busyId === a.id ? "..." : t("დარეგისტრირებული", "Registered")}
                                </button>
                              )
                              : (
                                <button
                                  className="btn btn-primary btn-sm"
                                  disabled={busyId === a.id}
                                  onClick={() => toggleInterest(a)}
                                >
                                  {busyId === a.id ? "..." : t("რეგისტრაცია", "Register")}
                                </button>
                              )
                          )}
                        </div>
                      )}
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
