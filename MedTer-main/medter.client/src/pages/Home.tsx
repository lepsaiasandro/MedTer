import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { usePrefs } from "../i18n";
import { Cap, Chat, Check, Trophy, Users } from "../components/icons";
import logoIcon from "../assets/medter-icon.png";

export default function Home() {
  const { user } = useAuth();
  const { t } = usePrefs();
  const navigate = useNavigate();

  const isDoctor = user?.role === "Doctor";
  const isCenter = user?.role === "TrainingCenter";

  const features = [
    {
      icon: <Users size={22} />,
      title: t("ტრენინგ ცენტრები", "Training Centers"),
      text: t(
        "იპოვე სანდო ცენტრები ერთ სივრცეში, ნახე რეიტინგი და დეტალები.",
        "Find trusted centers in one place, browse ratings and details."
      ),
    },
    {
      icon: <Cap size={22} />,
      title: t("ტრენინგები და კონფერენციები", "Trainings & Conferences"),
      text: t(
        "გაეცანი განცხადებებს, თარიღებს და თემებს — დარეგისტრირდი ან განათავსე.",
        "Browse announcements, dates and topics — register or publish."
      ),
    },
    {
      icon: <Chat size={22} />,
      title: t("პირდაპირი კომუნიკაცია", "Direct Communication"),
      text: t(
        "ექიმები და ცენტრები ურთიერთობენ ლაივ ჩატით — სწრაფად და მარტივად.",
        "Doctors and centers connect via live chat — fast and simple."
      ),
    },
    {
      icon: <Trophy size={22} />,
      title: t("უსდ ქულები და სერტიფიკატები", "CPD Points & Certificates"),
      text: t(
        "აკონტროლე პროფესიული განვითარება — ქულები და სერტიფიკატები ერთ ადგილას.",
        "Track professional growth — points and certificates in one place."
      ),
    },
  ];

  const forDoctors = [
    t("ცენტრების ძიება და დეტალური ნახვა", "Search and view training centers"),
    t("ტრენინგებზე რეგისტრაცია", "Register for trainings"),
    t("ცენტრთან ჩატი", "Chat with centers"),
    t("სერტიფიკატების ნახვა", "View certificates"),
  ];

  const forCenters = [
    t("ტრენინგებისა და კონფერენციების განთავსება", "Publish trainings and conferences"),
    t("ექიმებთან კომუნიკაცია", "Communicate with doctors"),
    t("ინფორმაციისა და ბანერის გამოქვეყნება", "Publish info and banners"),
    t("უსდ ქულების მინიჭება", "Grant CPD points"),
  ];

  return (
    <div>
      <div className="hero" style={{ marginBottom: 28 }}>
        <img src={logoIcon} alt="" className="hero-mark hero-logo" aria-hidden="true" />
        <h1>
          {user
            ? <>{t("გამარჯობა", "Hello")}, {user.displayName}</>
            : t("კეთილი იყოს თქვენი მობრძანება MedTer-ზე", "Welcome to MedTer")}
        </h1>
        <p>
          {t(
            "MedTer — სამედიცინო ტრენინგების პლატფორმა. აქ ერთიანდება ტრენინგ ცენტრები, კონფერენციები, უსდ ქულები და პროფესიული კომუნიკაცია.",
            "MedTer — a medical training platform. Training centers, conferences, CPD points and professional communication in one place."
          )}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 18 }}>
          <button className="btn btn-ghost btn-sm" style={{ background: "rgba(255,255,255,0.95)", color: "var(--navy)" }} onClick={() => navigate("/centers")}>
            {t("ტრენინგ ცენტრები", "Training Centers")}
          </button>
          {user && (
            <button className="btn btn-sm" style={{ background: "rgba(255,255,255,0.18)", color: "#fff", border: "1px solid rgba(255,255,255,0.35)" }} onClick={() => navigate("/announcements")}>
              {t("ტრენინგები", "Trainings")}
            </button>
          )}
        </div>
      </div>

      <h2 className="section-title">{t("რა არის MedTer?", "What is MedTer?")}</h2>
      <p style={{ color: "var(--muted)", fontSize: 14.5, maxWidth: 720, marginBottom: 24, marginTop: -4, lineHeight: 1.6 }}>
        {t(
          "MedTer აერთიანებს ტრენინგ ცენტრებსა და ექიმებს ერთ ციფრულ სივრცეში — რომ პროფესიული განვითარება იყოს უფრო ხელმისაწვდომი, გამჭვირვალე და ეფექტური.",
          "MedTer brings training centers and doctors together in one digital space — so professional development is more accessible, transparent and effective."
        )}
      </p>

      <div className="grid grid-2" style={{ marginBottom: 32 }}>
        {features.map((f) => (
          <article key={f.title} className="card">
            <div className="body">
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 10,
                  display: "grid",
                  placeItems: "center",
                  background: "var(--brand-soft)",
                  color: "var(--brand)",
                }}
              >
                {f.icon}
              </div>
              <h3>{f.title}</h3>
              <p className="desc">{f.text}</p>
            </div>
          </article>
        ))}
      </div>

      <div className="grid grid-2" style={{ marginBottom: 8 }}>
        <article className="card">
          <div className="body">
            <h3>{t("ექიმებისთვის", "For Doctors")}</h3>
            <ul className="checks" style={{ marginTop: 4 }}>
              {forDoctors.map((item) => (
                <li key={item}><Check size={16} /> {item}</li>
              ))}
            </ul>
            {isDoctor && (
              <button className="btn btn-primary btn-sm" style={{ marginTop: 8, alignSelf: "flex-start" }} onClick={() => navigate("/centers")}>
                {t("ცენტრების ნახვა", "Browse Centers")}
              </button>
            )}
          </div>
        </article>
        <article className="card">
          <div className="body">
            <h3>{t("ტრენინგ ცენტრებისთვის", "For Training Centers")}</h3>
            <ul className="checks" style={{ marginTop: 4 }}>
              {forCenters.map((item) => (
                <li key={item}><Check size={16} /> {item}</li>
              ))}
            </ul>
            {isCenter && (
              <button className="btn btn-primary btn-sm" style={{ marginTop: 8, alignSelf: "flex-start" }} onClick={() => navigate("/my-announcements")}>
                {t("ჩემი განცხადებები", "My Announcements")}
              </button>
            )}
          </div>
        </article>
      </div>
    </div>
  );
}
