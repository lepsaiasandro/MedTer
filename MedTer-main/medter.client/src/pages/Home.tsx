import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { useAuth } from "../auth";
import { usePrefs } from "../i18n";
import { Cap, Chat, Check, Trophy, Users, Calendar, Clock, Pin } from "../components/icons";
import { StarsView } from "../components/Stars";
import LinearAdBanner from "../components/LinearAdBanner";
import logoIcon from "../assets/medter-icon.png";

interface TopCenter {
  userId: string;
  name: string;
  city?: string;
  averageRating: number;
  ratingCount: number;
}

interface AnnouncementLite {
  id: number;
  title: string;
  startDate?: string;
  points: number;
  isInterested: boolean;
  centerName: string;
}

interface CertLite { id: number; points: number; }
interface MyAnn { id: number; status: string; interestedCount: number; title: string; }

export default function Home() {
  const { user } = useAuth();

  if (!user) return <Landing />;
  if (user.role === "Doctor") return <DoctorHome />;
  if (user.role === "TrainingCenter") return <CenterHome />;
  return <Landing />;
}

function Landing() {
  const { t } = usePrefs();
  const navigate = useNavigate();
  const [topCenters, setTopCenters] = useState<TopCenter[]>([]);
  const [loadingTop, setLoadingTop] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.get<TopCenter[]>("/training-centers")
      .then((r) => {
        if (cancelled) return;
        const ranked = [...r.data]
          .sort((a, b) => b.averageRating - a.averageRating || b.ratingCount - a.ratingCount || a.name.localeCompare(b.name, "ka"))
          .slice(0, 4);
        setTopCenters(ranked);
      })
      .catch(() => { if (!cancelled) setTopCenters([]); })
      .finally(() => { if (!cancelled) setLoadingTop(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="landing">
      <div className="landing-bg" aria-hidden="true">
        <div className="landing-hero-glow" />
        <div className="landing-hero-grid" />
        <svg className="landing-hero-ecg" viewBox="0 0 1200 80" preserveAspectRatio="none">
          <path
            d="M0 40 H100 L120 40 L140 12 L160 68 L180 36 L200 40 H380 L400 40 L420 10 L440 70 L460 34 L480 40 H680 L700 40 L720 8 L740 72 L760 32 L780 40 H1000 L1020 40 L1040 14 L1060 66 L1080 38 L1100 40 H1200"
            fill="none"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>

      <section className="landing-hero">
        <div className="landing-hero-inner">
          <img src={logoIcon} alt="" className="landing-brand" />
          <h1 className="landing-title">
            Med<span>Ter</span>
          </h1>
          <p className="landing-tagline">
            {t(
              "სამედიცინო ტრენინგები, ცენტრები და უსდ ქულები — ერთ ადგილას.",
              "Medical trainings, centers and CPD points — in one place."
            )}
          </p>
          <div className="landing-cta">
            <button className="btn btn-primary btn-lg" onClick={() => navigate("/centers")}>
              {t("ცენტრების ნახვა", "Browse centers")}
            </button>
            <button className="btn btn-ghost btn-lg" onClick={() => navigate("/register")}>
              {t("რეგისტრაცია", "Register")}
            </button>
          </div>
        </div>
      </section>

      <div className="landing-ads">
        <LinearAdBanner embedded />
      </div>

      <section className="landing-section landing-top">
        <div className="landing-top-head">
          <h2 className="section-title">{t("ტოპ ტრენინგ ცენტრები", "Top training centers")}</h2>
          <button type="button" className="btn btn-text btn-sm" onClick={() => navigate("/centers")}>
            {t("ყველა", "View all")}
          </button>
        </div>

        {loadingTop ? (
          <div className="landing-top-grid">
            {[0, 1, 2, 3].map((i) => <div key={i} className="landing-top-skel" />)}
          </div>
        ) : topCenters.length === 0 ? (
          <p className="landing-top-empty">
            {t("ჯერ არ არის ტრენინგ ცენტრები.", "No training centers yet.")}
          </p>
        ) : (
          <div className="landing-top-grid">
            {topCenters.map((c, i) => (
              <button
                key={c.userId}
                type="button"
                className="landing-top-card reveal"
                style={{ animationDelay: `${i * 60}ms` }}
                onClick={() => navigate("/centers")}
              >
                <span className="landing-top-rank">{i + 1}</span>
                <span className="landing-top-body">
                  <strong>{c.name}</strong>
                  {c.city && (
                    <span className="landing-top-city">
                      <Pin size={12} /> {c.city}
                    </span>
                  )}
                  <StarsView value={c.averageRating} count={c.ratingCount} size={13} />
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="landing-section landing-roles">
        <div className="landing-role reveal">
          <h3>{t("ექიმებისთვის", "For doctors")}</h3>
          <ul className="checks">
            <li><Check size={16} /> {t("ცენტრების ძიება და შეფასება", "Search and rate centers")}</li>
            <li><Check size={16} /> {t("ტრენინგებზე დაინტერესება", "Mark interest in trainings")}</li>
            <li><Check size={16} /> {t("უსდ ქულები და სერტიფიკატები", "CPD points and certificates")}</li>
          </ul>
        </div>
        <div className="landing-role reveal" style={{ animationDelay: "80ms" }}>
          <h3>{t("ტრენინგ ცენტრებისთვის", "For training centers")}</h3>
          <ul className="checks">
            <li><Check size={16} /> {t("განცხადებების გამოქვეყნება", "Publish announcements")}</li>
            <li><Check size={16} /> {t("ექიმებთან ჩატი", "Chat with doctors")}</li>
            <li><Check size={16} /> {t("უსდ ქულების მინიჭება", "Grant CPD points")}</li>
          </ul>
        </div>
      </section>
    </div>
  );
}

function DoctorHome() {
  const { user } = useAuth();
  const { t, lang } = usePrefs();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  const [points, setPoints] = useState(0);
  const [upcoming, setUpcoming] = useState<AnnouncementLite[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [msgs, certs, anns] = await Promise.all([
          api.get<{ count: number }>("/chat/unread/count").catch(() => ({ data: { count: 0 } })),
          api.get<CertLite[]>("/certificates/mine").catch(() => ({ data: [] as CertLite[] })),
          api.get<AnnouncementLite[]>("/announcements").catch(() => ({ data: [] as AnnouncementLite[] })),
        ]);
        if (cancelled) return;
        setUnread(msgs.data.count);
        setPoints(certs.data.reduce((s, c) => s + c.points, 0));
        const interested = anns.data
          .filter((a) => a.isInterested)
          .sort((a, b) => new Date(a.startDate ?? 0).getTime() - new Date(b.startDate ?? 0).getTime())
          .slice(0, 4);
        setUpcoming(interested);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const fmt = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString(lang === "en" ? "en-GB" : "ka-GE", { day: "numeric", month: "short" });
  };

  return (
    <div className="home-dash">
      <header className="dash-welcome reveal">
        <div>
          <h1>{t("გამარჯობა", "Hello")}, {user?.displayName}</h1>
          <p>{t("შენი შემდეგი ნაბიჯები პროფესიული განვითარებისთვის.", "Your next steps for professional growth.")}</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate("/announcements")}>
          {t("ტრენინგების ნახვა", "Browse trainings")}
        </button>
      </header>

      <div className="stats stats-3 reveal">
        <button type="button" className="stat action-stat" onClick={() => navigate("/certificates")}>
          <div className="k">
            <span className="ic" style={{ background: "var(--teal-soft)", color: "var(--teal)" }}><Trophy size={14} /></span>
            {t("უსდ ქულები", "CPD points")}
          </div>
          <div className="v">{points}</div>
        </button>
        <button type="button" className="stat action-stat" onClick={() => navigate("/chat")}>
          <div className="k">
            <span className="ic" style={{ background: "var(--brand-soft)", color: "var(--brand)" }}><Chat size={14} /></span>
            {t("შეტყობინებები", "Messages")}
          </div>
          <div className="v">{unread}</div>
        </button>
        <button type="button" className="stat action-stat" onClick={() => navigate("/centers")}>
          <div className="k">
            <span className="ic" style={{ background: "var(--brand-soft)", color: "var(--brand)" }}><Users size={14} /></span>
            {t("ცენტრები", "Centers")}
          </div>
          <div className="v">→</div>
        </button>
      </div>

      <section className="dash-panel">
        <div className="dash-panel-head">
          <h2 className="section-title">{t("შენი ტრენინგები", "Your trainings")}</h2>
          {upcoming.length > 0 && (
            <button type="button" className="btn btn-text btn-sm" onClick={() => navigate("/announcements?mine=1")}>
              {t("ყველა", "View all")}
            </button>
          )}
        </div>
        {upcoming.length === 0 ? (
          <div className="dash-empty reveal">
            <p>{t("ჯერ არ გაქვს დარეგისტრირებული ტრენინგი.", "You haven't registered for any trainings yet.")}</p>
            <button className="btn btn-primary btn-sm" onClick={() => navigate("/announcements")}>
              {t("ტრენინგების ძიება", "Find trainings")}
            </button>
          </div>
        ) : (
          <div className="dash-list">
            {upcoming.map((a, i) => (
              <button
                key={a.id}
                type="button"
                className="dash-list-item reveal"
                style={{ animationDelay: `${i * 50}ms` }}
                onClick={() => navigate("/announcements?mine=1")}
              >
                <span className="dash-list-ic"><Calendar size={18} /></span>
                <span className="dash-list-body">
                  <strong>{a.title}</strong>
                  <span>{a.centerName}{a.startDate ? ` · ${fmt(a.startDate)}` : ""}</span>
                </span>
                <span className="trust-chip trust-chip--ok">{t("დარეგისტრირებული", "Registered")}</span>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function CenterHome() {
  const { user } = useAuth();
  const { t } = usePrefs();
  const navigate = useNavigate();
  const [pending, setPending] = useState(0);
  const [published, setPublished] = useState(0);
  const [interest, setInterest] = useState(0);
  const [drafts, setDrafts] = useState<MyAnn[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: list } = await api.get<MyAnn[]>("/announcements/mine").catch(() => ({ data: [] as MyAnn[] }));
        if (cancelled) return;
        setPending(list.filter((a) => a.status === "Pending").length);
        setPublished(list.filter((a) => a.status === "Published").length);
        setInterest(list.reduce((s, a) => s + (a.interestedCount || 0), 0));
        setDrafts(list.filter((a) => a.status === "Draft" || a.status === "Pending").slice(0, 4));
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="home-dash">
      <header className="dash-welcome reveal">
        <div>
          <h1>{t("გამარჯობა", "Hello")}, {user?.displayName}</h1>
          <p>{t("განცხადებები, დაინტერესებები და შეტყობინებები ერთ ადგილას.", "Announcements, interest and messages in one place.")}</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate("/my-announcements")}>
          {t("ჩემი განცხადებები", "My announcements")}
        </button>
      </header>

      <div className="stats stats-3 reveal">
        <button type="button" className="stat action-stat" onClick={() => navigate("/my-announcements")}>
          <div className="k">
            <span className="ic" style={{ background: "var(--brand-soft)", color: "var(--brand)" }}><Cap size={14} /></span>
            {t("გამოქვეყნებული", "Published")}
          </div>
          <div className="v">{published}</div>
        </button>
        <button type="button" className="stat action-stat" onClick={() => navigate("/my-announcements")}>
          <div className="k">
            <span className="ic" style={{ background: "var(--warning-soft)", color: "var(--warning)" }}><Clock size={14} /></span>
            {t("მოლოდინში", "Pending")}
          </div>
          <div className="v">{pending}</div>
        </button>
        <button type="button" className="stat action-stat" onClick={() => navigate("/my-announcements")}>
          <div className="k">
            <span className="ic" style={{ background: "var(--teal-soft)", color: "var(--teal)" }}><Users size={14} /></span>
            {t("დაინტერესდა", "Interested")}
          </div>
          <div className="v">{interest}</div>
        </button>
      </div>

      <section className="dash-panel">
        <div className="dash-panel-head">
          <h2 className="section-title">{t("საჭიროებს ყურადღებას", "Needs attention")}</h2>
        </div>
        {drafts.length === 0 ? (
          <div className="dash-empty reveal">
            <p>{t("ყველა განცხადება განახლებულია. შექმენი ახალი ტრენინგი.", "Everything is up to date. Create a new training.")}</p>
            <button className="btn btn-primary btn-sm" onClick={() => navigate("/my-announcements")}>
              {t("ახალი განცხადება", "New announcement")}
            </button>
          </div>
        ) : (
          <div className="dash-list">
            {drafts.map((a, i) => (
              <button
                key={a.id}
                type="button"
                className="dash-list-item reveal"
                style={{ animationDelay: `${i * 50}ms` }}
                onClick={() => navigate("/my-announcements")}
              >
                <span className="dash-list-ic"><Cap size={18} /></span>
                <span className="dash-list-body">
                  <strong>{a.title}</strong>
                  <span>
                    {a.status === "Pending"
                      ? t("ადმინის დამტკიცებას ელოდება", "Awaiting admin approval")
                      : t("დრაფტი", "Draft")}
                  </span>
                </span>
                <span className={`trust-chip ${a.status === "Pending" ? "trust-chip--warn" : ""}`}>
                  {a.status === "Pending" ? t("მოლოდინში", "Pending") : t("დრაფტი", "Draft")}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
