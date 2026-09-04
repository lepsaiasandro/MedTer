import { useEffect, useMemo, useState } from "react";
import api from "../api";
import { useAuth } from "../auth";
import { usePrefs } from "../i18n";
import { Calendar, Pin, Mail, Search, Check, Bookmark } from "../components/icons";
import ShareMenu from "../components/ShareMenu";

interface Announcement {
  id: number;
  title: string;
  category?: string;
  format?: string;
  shortDescription?: string;
  description?: string;
  city?: string;
  points: number;
  price: number;
  seats?: number;
  imageUrl?: string;
  startDate?: string;
  centerName: string;
  interestedCount: number;
  isInterested: boolean;
  isFavorite: boolean;
}

const MONTHS_KA = ["იანვარი", "თებერვალი", "მარტი", "აპრილი", "მაისი", "ივნისი", "ივლისი", "აგვისტო", "სექტემბერი", "ოქტომბერი", "ნოემბერი", "დეკემბერი"];
const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function Announcements() {
  const { user } = useAuth();
  const { t, lang } = usePrefs();
  const isDoctor = user?.role === "Doctor";
  const [items, setItems] = useState<Announcement[]>([]);

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

  const load = () => api.get<Announcement[]>("/announcements").then((r) => setItems(r.data));
  useEffect(() => { load(); }, []);

  const toggleInterest = async (a: Announcement) => {
    if (a.isInterested) await api.delete(`/announcements/${a.id}/interest`);
    else await api.post(`/announcements/${a.id}/interest`);
    load();
  };
  const toggleFav = async (a: Announcement) => {
    if (a.isFavorite) await api.delete(`/announcements/${a.id}/favorite`);
    else await api.post(`/announcements/${a.id}/favorite`);
    load();
  };

  const categories = useMemo(() => [...new Set(items.map((a) => a.category).filter(Boolean))] as string[], [items]);
  const cities = useMemo(() => [...new Set(items.map((a) => a.city).filter(Boolean))] as string[], [items]);

  const visible = useMemo(() => {
    let list = items.filter((a) => {
      if (search && !a.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (category && a.category !== category) return false;
      if (format && a.format !== format) return false;
      if (city && a.city !== city) return false;
      if (price === "free" && a.price > 0) return false;
      if (price === "paid" && a.price === 0) return false;
      if (favOnly && !a.isFavorite) return false;
      return true;
    });
    if (sort === "date") list = [...list].sort((a, b) => new Date(a.startDate ?? 0).getTime() - new Date(b.startDate ?? 0).getTime());
    else if (sort === "points") list = [...list].sort((a, b) => b.points - a.points);
    else if (sort === "interested") list = [...list].sort((a, b) => b.interestedCount - a.interestedCount);
    return list;
  }, [items, search, category, format, city, price, favOnly, sort]);

  return (
    <div>
      <div className="page-head">
        <div className="h-text">
          <h1>{t("ტრენინგები", "Trainings")}</h1>
          <p>{t("დაათვალიერე კონფერენციები და ტრენინგები, დააფიქსირე დაინტერესება", "Browse conferences and trainings, mark your interest")}</p>
        </div>
      </div>

      {/* filters */}
      <div className="toolbar">
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
        {isDoctor && (
          <button className={`select-mini ${favOnly ? "active" : ""}`} style={favOnly ? { borderColor: "var(--brand)", color: "var(--brand)" } : undefined} onClick={() => setFavOnly((v) => !v)}>
            <Bookmark size={15} filled={favOnly} /> {t("რჩეულები", "Favorites")}
          </button>
        )}
        <div className="search">
          <Search size={16} />
          <input placeholder={t("ძებნა სათაურით…", "Search by title…")} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {items.length === 0 ? (
        <div className="empty">
          <div className="ill"><Calendar size={42} sw={1.6} /></div>
          <h2>{t("ჯერ არ არის ტრენინგები", "No trainings yet")}</h2>
          <p>{t("როგორც კი ტრენინგ ცენტრები გამოაქვეყნებენ განცხადებებს, აქ დაინახავ.", "Once training centers publish announcements, you'll see them here.")}</p>
        </div>
      ) : visible.length === 0 ? (
        <p style={{ color: "var(--muted)", fontSize: 14 }}>{t("ვერაფერი მოიძებნა.", "Nothing found.")}</p>
      ) : (
        <div className="grid">
          {visible.map((a) => (
            <article key={a.id} className="card card-interactive">
              <div className="media pv-media">
                {a.imageUrl
                  ? <img src={a.imageUrl} alt="" />
                  : <img src={`https://loremflickr.com/480/270/medical,training?lock=${a.id + 10}`} onError={(e) => { e.currentTarget.src = `https://picsum.photos/seed/a${a.id}/480/270`; }} alt="" />}
                <span className="badge-points"><span className="tealdot" /> {a.points} {t("ქულა", "pts")}</span>
                {isDoctor && (
                  <button className="act" title={t("რჩეულებში დამატება", "Add to favorites")}
                    style={{ position: "absolute", top: 8, right: 8, background: "rgba(255,255,255,.92)", color: a.isFavorite ? "var(--brand)" : "var(--muted)" }}
                    onClick={() => toggleFav(a)}>
                    <Bookmark size={16} filled={a.isFavorite} />
                  </button>
                )}
              </div>
              <div className="body">
                {a.category && <span className="chip-cat">{a.category}</span>}
                <h3>{a.title}</h3>
                <div style={{ fontSize: 12, color: "var(--soft)", marginTop: -4 }}>{a.centerName}</div>
                <div className="meta">
                  {a.startDate && <div className="row"><Calendar size={15} /> {fmtDate(a.startDate)}</div>}
                  <div className="row">
                    {a.format === "ონლაინ" ? <Mail size={15} /> : <Pin size={15} />}
                    {a.format === "ონლაინ" ? t("ონლაინ კურსი", "Online course") : `${a.city ? a.city + " · " : ""}${t("დასწრებით", "In person")}`}
                  </div>
                </div>
                <div className="foot">
                  <span style={{ fontSize: 12.5, color: "var(--muted)" }}>{a.interestedCount} {t("დაინტერესდა", "interested")}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <ShareMenu title={a.title} />
                    {isDoctor && (
                      a.isInterested
                        ? <button className="pill-interest on" onClick={() => toggleInterest(a)}><Check size={14} /> {t("დაინტერესებული", "Interested")}</button>
                        : <button className="btn btn-primary btn-sm" onClick={() => toggleInterest(a)}>{t("დაინტერესება", "Interested?")}</button>
                    )}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
