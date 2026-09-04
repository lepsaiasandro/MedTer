import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { useAuth } from "../auth";
import { usePrefs } from "../i18n";
import PointsPanel from "../components/PointsPanel";
import { Pin } from "../components/icons";
import { StarsView } from "../components/Stars";
import logoIcon from "../assets/medter-icon.png";

interface TrainingCenter {
  userId: string;
  name: string;
  description?: string;
  city?: string;
  phone?: string;
  averageRating: number;
  ratingCount: number;
  myRating?: number;
}

// Frontend-only mock points shown on the card badge.
const MOCK_POINTS = [20, 16, 24, 12, 10, 8];

export default function Dashboard() {
  const { user } = useAuth();
  const { t } = usePrefs();
  const navigate = useNavigate();
  const [centers, setCenters] = useState<TrainingCenter[]>([]);

  useEffect(() => {
    api.get<TrainingCenter[]>("/training-centers").then((r) => setCenters(r.data));
  }, []);

  const isDoctor = user?.role === "Doctor";

  const message = (c: TrainingCenter) => {
    navigate("/chat", {
      state: { contact: { id: c.userId, displayName: c.name, role: "TrainingCenter", city: c.city } },
    });
  };

  return (
    <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Hero */}
        <div className="hero" style={{ marginBottom: 28 }}>
          <img src={logoIcon} alt="" className="hero-mark hero-logo" aria-hidden="true" />
          <h1>{t("გამარჯობა", "Hello")}, {user?.displayName}</h1>
          <p>{isDoctor
            ? t("იპოვე ტრენინგ ცენტრები, დაათვალიერე ტრენინგები და დაუკავშირდი მათ.", "Find training centers, browse trainings and get in touch.")
            : t("მართე შენი ცენტრი, გამოაქვეყნე ტრენინგები და დაუკავშირდი ექიმებს.", "Manage your center, publish trainings and connect with doctors.")}</p>
        </div>

        <h2 className="section-title">{t("ტრენინგ ცენტრები", "Training Centers")}</h2>
        {centers.length === 0 ? (
          <p style={{ color: "var(--muted)", fontSize: 14 }}>{t("ჯერ არ არის ტრენინგ ცენტრები.", "No training centers yet.")}</p>
        ) : (
          <div className="grid grid-4">
            {centers.map((c, i) => (
              <article key={c.userId} className="card card-interactive">
                <div className="media">
                  <img
                    src={`https://loremflickr.com/480/270/medical,hospital?lock=${i + 1}`}
                    onError={(e) => { e.currentTarget.src = `https://picsum.photos/seed/${encodeURIComponent(c.userId)}/480/270`; }}
                    alt={c.name}
                  />
                  <span className="badge-points"><span className="tealdot" /> {MOCK_POINTS[i % MOCK_POINTS.length]} ქულა</span>
                </div>
                <div className="body">
                  <h3>{c.name}</h3>
                  <StarsView value={c.averageRating} count={c.ratingCount} />
                  {c.city && <div className="meta"><div className="row"><Pin size={15} /> {c.city}</div></div>}
                  {c.description && <p className="desc" style={{ flex: 1 }}>{c.description}</p>}
                  <div style={{ marginTop: "auto", paddingTop: 4, display: "flex", flexDirection: "column", gap: 8 }}>
                    <button className="btn btn-ghost btn-sm btn-block" onClick={() => navigate(`/centers/${c.userId}`)}>{t("დეტალურად", "Details")}</button>
                    {isDoctor && <button className="btn btn-primary btn-sm btn-block" onClick={() => message(c)}>{t("მიწერა", "Message")}</button>}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {isDoctor && (
        <aside style={{ width: 288, flex: "none" }} className="hidden lg:block">
          <PointsPanel />
        </aside>
      )}
    </div>
  );
}
