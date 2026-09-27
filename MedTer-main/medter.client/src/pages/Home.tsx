import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { useAuth } from "../auth";
import { usePrefs } from "../i18n";
import { Cap, Chat, Check, Trophy, Users, Calendar, Clock } from "../components/icons";
import logoIcon from "../assets/medter-icon.png";

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

  const steps = [
    {
      icon: <Users size={22} />,
      title: t("იპოვე ცენტრები", "Find centers"),
      text: t("სანდო ტრენინგ ცენტრები ერთ სივრცეში.", "Trusted training centers in one place."),
    },
    {
      icon: <Cap size={22} />,
      title: t("აირჩიე ტრენინგი", "Pick a training"),
      text: t("კონფერენციები, თარიღები და უსდ ქულები.", "Conferences, dates and CPD points."),
    },
    {
      icon: <Chat size={22} />,
      title: t("დაუკავშირდი", "Connect"),
      text: t("ლაივ ჩატი ცენტრებთან და კოლეგებთან.", "Live chat with centers and peers."),
    },
  ];

  return (
    <div className="landing">
      <section className="landing-hero">
        <div className="landing-hero-copy">
          <img src={logoIcon} alt="MedTer" className="landing-brand" />
          <h1 className="landing-title">
            Med<span>Ter</span>
          </h1>
          <p className="landing-tagline">
            {t(
              "სამედიცინო ტრენინგების პლატფორმა — ცენტრები, კონფერენციები და უსდ ქულები ერთ ადგილას.",
              "A medical training platform — centers, conferences and CPD points in one place."
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
        <div className="landing-hero-visual" aria-hidden="true">
          <div className="landing-visual-card">
            <span className="landing-visual-kicker">CONNECT · DISCUSS · ADVANCE</span>
            <strong>{t("პროფესიული განვითარება", "Professional growth")}</strong>
            <span>{t("ექიმებისა და ტრენინგ ცენტრებისთვის", "For doctors and training centers")}</span>
          </div>
        </div>
      </section>

      <section className="landing-section">
        <h2 className="section-title">{t("როგორ მუშაობს", "How it works")}</h2>
        <p className="landing-lead">
          {t(
            "სამი ნაბიჯი — რეგისტრაციიდან ტრენინგამდე.",
            "Three steps — from signup to your next training."
          )}
        </p>
        <div className="landing-steps">
          {steps.map((s, i) => (
            <article key={s.title} className="landing-step reveal" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="landing-step-ic">{s.icon}</div>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section landing-roles">
        <div className="landing-role">
          <h3>{t("ექიმებისთვის", "For doctors")}</h3>
          <ul className="checks">
            <li><Check size={16} /> {t("ცენტრების ძიება და შეფასება", "Search and rate centers")}</li>
            <li><Check size={16} /> {t("ტრენინგებზე დაინტერესება", "Mark interest in trainings")}</li>
            <li><Check size={16} /> {t("უსდ ქულები და სერტიფიკატები", "CPD points and certificates")}</li>
          </ul>
        </div>
        <div className="landing-role">
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
          .slice(0, 3);
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
    <div>
      <div className="dash-welcome reveal">
        <div>
          <p className="dash-kicker">{t("ექიმის პანელი", "Doctor dashboard")}</p>
          <h1>{t("გამარჯობა", "Hello")}, {user?.displayName}</h1>
          <p>{t("შენი შემდეგი ნაბიჯები პროფესიული განვითარებისთვის.", "Your next steps for professional growth.")}</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate("/announcements")}>
          {t("ტრენინგების ნახვა", "Browse trainings")}
        </button>
      </div>

      <div className="stats reveal">
        <button type="button" className="stat action-stat" onClick={() => navigate("/announcements")}>
          <div className="k"><span className="ic" style={{ background: "var(--brand-soft)", color: "var(--brand)" }}><Cap size={14} /></span>{t("ტრენინგები", "Trainings")}</div>
          <div className="v">{upcoming.length || "—"}</div>
        </button>
        <button type="button" className="stat action-stat" onClick={() => navigate("/certificates")}>
          <div className="k"><span className="ic" style={{ background: "var(--teal-soft)", color: "var(--teal)" }}><Trophy size={14} /></span>{t("უსდ ქულები", "CPD points")}</div>
          <div className="v">{points}</div>
        </button>
        <button type="button" className="stat action-stat" onClick={() => navigate("/chat")}>
          <div className="k"><span className="ic" style={{ background: "var(--brand-soft)", color: "var(--brand)" }}><Chat size={14} /></span>{t("შეტყობინებები", "Messages")}</div>
          <div className="v">{unread}</div>
        </button>
        <button type="button" className="stat action-stat" onClick={() => navigate("/centers")}>
          <div className="k"><span className="ic" style={{ background: "var(--teal-soft)", color: "var(--teal)" }}><Users size={14} /></span>{t("ცენტრები", "Centers")}</div>
          <div className="v">→</div>
        </button>
      </div>

      <h2 className="section-title">{t("შენი დაინტერესებები", "Your interests")}</h2>
      {upcoming.length === 0 ? (
        <div className="card reveal" style={{ padding: 20 }}>
          <p style={{ color: "var(--muted)", marginBottom: 12 }}>
            {t("ჯერ არ გაქვს დაინტერესებული ტრენინგი.", "You haven't marked interest in any trainings yet.")}
          </p>
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
              style={{ animationDelay: `${i * 60}ms` }}
              onClick={() => navigate("/announcements")}
            >
              <span className="dash-list-ic"><Calendar size={18} /></span>
              <span className="dash-list-body">
                <strong>{a.title}</strong>
                <span>{a.centerName}{a.startDate ? ` · ${fmt(a.startDate)}` : ""}</span>
              </span>
              <span className="trust-chip">{a.points} {t("ქულა", "pts")}</span>
            </button>
          ))}
        </div>
      )}
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
  const [unread, setUnread] = useState(0);
  const [drafts, setDrafts] = useState<MyAnn[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [msgs, mine] = await Promise.all([
          api.get<{ count: number }>("/chat/unread/count").catch(() => ({ data: { count: 0 } })),
          api.get<MyAnn[]>("/announcements/mine").catch(() => ({ data: [] as MyAnn[] })),
        ]);
        if (cancelled) return;
        setUnread(msgs.data.count);
        const list = mine.data;
        setPending(list.filter((a) => a.status === "Pending").length);
        setPublished(list.filter((a) => a.status === "Published").length);
        setInterest(list.reduce((s, a) => s + (a.interestedCount || 0), 0));
        setDrafts(list.filter((a) => a.status === "Draft" || a.status === "Pending").slice(0, 3));
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div>
      <div className="dash-welcome reveal">
        <div>
          <p className="dash-kicker">{t("ცენტრის პანელი", "Center dashboard")}</p>
          <h1>{t("გამარჯობა", "Hello")}, {user?.displayName}</h1>
          <p>{t("განცხადებები, დაინტერესებები და შეტყობინებები ერთ ადგილას.", "Announcements, interest and messages in one place.")}</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate("/my-announcements")}>
          {t("ჩემი განცხადებები", "My announcements")}
        </button>
      </div>

      <div className="stats reveal">
        <button type="button" className="stat action-stat" onClick={() => navigate("/my-announcements")}>
          <div className="k"><span className="ic" style={{ background: "var(--brand-soft)", color: "var(--brand)" }}><Cap size={14} /></span>{t("გამოქვეყნებული", "Published")}</div>
          <div className="v">{published}</div>
        </button>
        <button type="button" className="stat action-stat" onClick={() => navigate("/my-announcements")}>
          <div className="k"><span className="ic" style={{ background: "var(--warning-soft)", color: "var(--warning)" }}><Clock size={14} /></span>{t("მოლოდინში", "Pending")}</div>
          <div className="v">{pending}</div>
        </button>
        <button type="button" className="stat action-stat" onClick={() => navigate("/my-announcements")}>
          <div className="k"><span className="ic" style={{ background: "var(--teal-soft)", color: "var(--teal)" }}><Users size={14} /></span>{t("დაინტერესდა", "Interested")}</div>
          <div className="v">{interest}</div>
        </button>
        <button type="button" className="stat action-stat" onClick={() => navigate("/chat")}>
          <div className="k"><span className="ic" style={{ background: "var(--brand-soft)", color: "var(--brand)" }}><Chat size={14} /></span>{t("შეტყობინებები", "Messages")}</div>
          <div className="v">{unread}</div>
        </button>
      </div>

      <h2 className="section-title">{t("საჭიროებს ყურადღებას", "Needs attention")}</h2>
      {drafts.length === 0 ? (
        <div className="card reveal" style={{ padding: 20 }}>
          <p style={{ color: "var(--muted)", marginBottom: 12 }}>
            {t("ყველა განცხადება განახლებულია. შექმენი ახალი ტრენინგი.", "Everything is up to date. Create a new training.")}
          </p>
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
              style={{ animationDelay: `${i * 60}ms` }}
              onClick={() => navigate("/my-announcements")}
            >
              <span className="dash-list-ic"><Cap size={18} /></span>
              <span className="dash-list-body">
                <strong>{a.title}</strong>
                <span>{a.status === "Pending" ? t("ადმინის დამტკიცებას ელოდება", "Awaiting admin approval") : t("დრაფტი", "Draft")}</span>
              </span>
              <span className={`trust-chip ${a.status === "Pending" ? "trust-chip--warn" : ""}`}>
                {a.status === "Pending" ? t("მოლოდინში", "Pending") : t("დრაფტი", "Draft")}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
