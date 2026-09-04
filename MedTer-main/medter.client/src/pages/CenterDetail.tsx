import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api";
import { useAuth } from "../auth";
import { ArrowLeft, Pin, Calendar, Mail, Check, Bookmark } from "../components/icons";
import { StarsView, StarsInput } from "../components/Stars";
import ShareMenu from "../components/ShareMenu";
import { usePrefs } from "../i18n";

interface TrainingCenter {
  userId: string; name: string; description?: string; city?: string; phone?: string;
  averageRating: number; ratingCount: number; myRating?: number;
}
interface Announcement {
  id: number; title: string; category?: string; format?: string; description?: string;
  city?: string; points: number; startDate?: string; imageUrl?: string;
  centerUserId: string; isInterested: boolean; interestedCount: number; isFavorite: boolean;
}

const MONTHS_KA = ["იანვარი", "თებერვალი", "მარტი", "აპრილი", "მაისი", "ივნისი", "ივლისი", "აგვისტო", "სექტემბერი", "ოქტომბერი", "ნოემბერი", "დეკემბერი"];
const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function CenterDetail() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, lang } = usePrefs();
  const isDoctor = user?.role === "Doctor";
  const fmtDate = (iso?: string) => { if (!iso) return ""; const d = new Date(iso); return isNaN(d.getTime()) ? "" : `${d.getDate()} ${(lang === "en" ? MONTHS_EN : MONTHS_KA)[d.getMonth()]}, ${d.getFullYear()}`; };
  const [center, setCenter] = useState<TrainingCenter | null>(null);
  const [items, setItems] = useState<Announcement[]>([]);

  const load = async () => {
    const [centers, anns] = await Promise.all([
      api.get<TrainingCenter[]>("/training-centers"),
      api.get<Announcement[]>("/announcements"),
    ]);
    setCenter(centers.data.find((c) => c.userId === userId) ?? null);
    setItems(anns.data.filter((a) => a.centerUserId === userId));
  };
  useEffect(() => { load(); }, [userId]);

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

  const rate = async (stars: number) => {
    if (!center) return;
    await api.post(`/training-centers/${center.userId}/rating`, { stars });
    load();
  };

  const message = () => {
    if (!center) return;
    navigate("/chat", { state: { contact: { id: center.userId, displayName: center.name, role: "TrainingCenter", city: center.city } } });
  };

  if (!center) return <div style={{ color: "var(--soft)", fontSize: 14 }}>{t("იტვირთება...", "Loading...")}</div>;

  return (
    <div>
      <a className="back-link" onClick={() => navigate(-1)}><ArrowLeft size={16} /> {t("უკან", "Back")}</a>

      {/* Center header */}
      <div className="card" style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ width: 64, height: 64, borderRadius: 18, flex: "none", background: "var(--brand-soft)", color: "var(--brand)", display: "grid", placeItems: "center", fontSize: 26, fontWeight: 800 }}>
            {center.name.charAt(0)}
          </span>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text)" }}>{center.name}</h1>
            <div className="meta" style={{ marginTop: 6 }}>
              <div className="row">
                {center.city && <><Pin size={15} /> {center.city}</>}
                {center.phone && <span style={{ marginLeft: 8 }}>· 📞 {center.phone}</span>}
              </div>
            </div>
          </div>
          {isDoctor && <button className="btn btn-primary" onClick={message}>{t("მიწერა", "Message")}</button>}
        </div>
        {center.description && <p style={{ color: "var(--text-body)", marginTop: 16, fontSize: 14 }}>{center.description}</p>}

        <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, color: "var(--soft)", fontWeight: 600, marginBottom: 4 }}>{t("საშუალო შეფასება", "Average rating")}</div>
            <StarsView value={center.averageRating} count={center.ratingCount} size={18} />
          </div>
          {isDoctor && (
            <div style={{ marginLeft: "auto" }}>
              <div style={{ fontSize: 12, color: "var(--soft)", fontWeight: 600, marginBottom: 4 }}>{center.myRating ? t("შენი შეფასება", "Your rating") : t("შეაფასე ეს ცენტრი", "Rate this center")}</div>
              <StarsInput value={center.myRating ?? 0} onRate={rate} />
            </div>
          )}
        </div>
      </div>

      <h2 className="section-title">{t("ამ ცენტრის ტრენინგები", "This center's trainings")}</h2>
      {items.length === 0 ? (
        <p style={{ color: "var(--muted)", fontSize: 14 }}>{t("ჯერ არ აქვს გამოქვეყნებული ტრენინგები.", "No published trainings yet.")}</p>
      ) : (
        <div className="grid">
          {items.map((a) => (
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
