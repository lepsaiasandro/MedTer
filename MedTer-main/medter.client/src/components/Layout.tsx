import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { usePrefs } from "../i18n";
import api from "../api";
import { Logo, Bell, Chat, ChevronDown, Home, Cap, Check, Sun, Moon } from "./icons";

interface Notif { id: number; text: string; isRead: boolean; createdAt: string; }

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { t, lang, setLang, theme, toggleTheme } = usePrefs();
  const location = useLocation();
  const navigate = useNavigate();

  const isCenter = user?.role === "TrainingCenter";
  const isDoctor = user?.role === "Doctor";
  const isAdmin = user?.role === "Admin";
  const roleLabel = isCenter ? t("ტრენინგ ცენტრი", "Training Center") : isAdmin ? t("ადმინისტრატორი", "Administrator") : t("ექიმი", "Doctor");
  const initial = user?.displayName?.charAt(0) ?? "?";

  const nav = isAdmin
    ? [{ to: "/", label: t("ადმინ პანელი", "Admin Panel") }, { to: "/announcements", label: t("ტრენინგები", "Trainings") }]
    : [
        { to: "/", label: t("მთავარი", "Home") },
        { to: "/announcements", label: t("ტრენინგები", "Trainings") },
        ...(isCenter ? [{ to: "/my-announcements", label: t("ჩემი განცხადებები", "My Announcements") }] : []),
        ...(isDoctor ? [{ to: "/certificates", label: t("ჩემი სერტიფიკატები", "My Certificates") }] : []),
      ];

  const [unreadMsgs, setUnreadMsgs] = useState(0);
  const [notifCount, setNotifCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);

  const refreshBadges = async () => {
    try {
      const [m, n] = await Promise.all([
        api.get<{ count: number }>("/chat/unread/count"),
        api.get<{ count: number }>("/notifications/unread-count"),
      ]);
      setUnreadMsgs(m.data.count);
      setNotifCount(n.data.count);
    } catch { /* ignore */ }
  };

  useEffect(() => { refreshBadges(); }, [location.pathname]);
  useEffect(() => {
    const timer = setInterval(refreshBadges, 20000);
    return () => clearInterval(timer);
  }, []);

  const openNotifs = async () => {
    if (notifOpen) { setNotifOpen(false); return; }
    setMenuOpen(false);
    const { data } = await api.get<Notif[]>("/notifications");
    setNotifs(data);
    setNotifOpen(true);
    if (notifCount > 0) { await api.post("/notifications/read-all"); setNotifCount(0); }
  };

  const doLogout = () => { logout(); navigate("/login"); };

  const footerLinks = [
    { to: "/", label: t("მთავარი", "Home"), icon: <Home size={16} /> },
    { to: "/announcements", label: t("ტრენინგები", "Trainings"), icon: <Cap size={16} /> },
    { to: "/chat", label: t("შეტყობინებები", "Messages"), icon: <Chat size={16} /> },
  ];
  const capabilities = [
    t("კონფერენციის/ტრენინგის განთავსება", "Post conferences / trainings"),
    t("ინფორმაციისა და ბანერის გამოქვეყნება", "Publish info and banners"),
    t("უსდ ქულების მიღება / მინიჭება", "Grant / earn CPD points"),
    t("მონაცემთა ანალიტიკა", "Data analytics"),
  ];

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <Link to="/" className="logo">
            <span className="logo-mark"><Logo /></span>
            <span>
              <div className="logo-name">Med<span>Ter</span></div>
              <div className="logo-tag">FOR DOCTORS. FOR GROWTH.</div>
            </span>
          </Link>

          <nav className="nav">
            {nav.map((item) => (
              <Link key={item.to} to={item.to} className={location.pathname === item.to ? "active" : ""}>{item.label}</Link>
            ))}
          </nav>

          <div className="top-actions">
            {/* Language toggle */}
            <button className="icon-btn" style={{ fontWeight: 800, fontSize: 12.5 }} onClick={() => setLang(lang === "ka" ? "en" : "ka")} title="Language">
              {lang === "ka" ? "EN" : "ქა"}
            </button>
            {/* Theme toggle */}
            <button className="icon-btn" onClick={toggleTheme} title={t("თემა", "Theme")}>
              {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {/* Notifications */}
            <div style={{ position: "relative" }}>
              <button className="icon-btn" aria-label={t("ნოთიფიკაციები", "Notifications")} onClick={openNotifs}>
                {notifCount > 0 && <span className="dot">{notifCount > 9 ? "9+" : notifCount}</span>}
                <Bell size={21} />
              </button>
              {notifOpen && (
                <>
                  <div style={{ position: "fixed", inset: 0, zIndex: 65 }} onClick={() => setNotifOpen(false)} />
                  <div className="dropdown wide">
                    <div className="dd-title">{t("ნოთიფიკაციები", "Notifications")}</div>
                    {notifs.length === 0
                      ? <div className="dd-empty">{t("ცარიელია", "Empty")}</div>
                      : notifs.map((n) => <div key={n.id} className="dd-item">{n.text}</div>)}
                  </div>
                </>
              )}
            </div>

            {/* Messages */}
            <Link to="/chat" className="icon-btn" aria-label={t("შეტყობინებები", "Messages")}>
              {unreadMsgs > 0 && <span className="dot">{unreadMsgs > 9 ? "9+" : unreadMsgs}</span>}
              <Chat size={21} />
            </Link>

            <div className="top-divider" />

            {/* Profile */}
            <div style={{ position: "relative" }}>
              <button className="profile" onClick={() => { setMenuOpen((o) => !o); setNotifOpen(false); }}>
                <span className="avatar">{initial}</span>
                <span className="profile-meta">
                  <span className="name">{user?.displayName}</span>
                  <span className="role">{roleLabel}</span>
                </span>
                <ChevronDown size={16} />
              </button>
              {menuOpen && (
                <>
                  <div style={{ position: "fixed", inset: 0, zIndex: 65 }} onClick={() => setMenuOpen(false)} />
                  <div className="dropdown">
                    <button className="dd-item" onClick={doLogout}>{t("გასვლა", "Log out")}</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="page">{children}</main>

      <footer className="footer">
        <div className="footer-inner">
          <div>
            <div className="foot-logo">
              <span className="logo-mark" style={{ width: 30, height: 30, borderRadius: 8 }}><Logo size={16} /></span>
              MedTer
            </div>
            <p>{t(
              "MedTer აერთიანებს ტრენინგ ცენტრებს ერთ სივრცეში — კონფერენციები, ტრენინგები, უსდ ქულები და სერტიფიკატები ქართველი პროფესიონალებისთვის.",
              "MedTer brings training centers together in one space — conferences, trainings, CPD points and certificates for Georgian professionals."
            )}</p>
          </div>
          <div>
            <h4>{t("ბმულები", "Links")}</h4>
            <ul className="links">
              {footerLinks.map((f) => <li key={f.label}><Link to={f.to}>{f.icon} {f.label}</Link></li>)}
            </ul>
          </div>
          <div>
            <h4>{t("ტრენინგ ცენტრის შესაძლებლობები", "Training Center Features")}</h4>
            <ul className="checks">
              {capabilities.map((c) => <li key={c}><Check size={16} /> {c}</li>)}
            </ul>
          </div>
        </div>
        <div className="copyright">{t("© 2026 MedTer. ყველა უფლება დაცულია.", "© 2026 MedTer. All rights reserved.")}</div>
      </footer>
    </div>
  );
}
