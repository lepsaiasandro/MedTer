import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { usePrefs } from "../i18n";
import api from "../api";
import { Bell, Chat, ChevronDown, Home, Cap, Check, Sun, Moon, Users } from "./icons";
import logoIcon from "../assets/medter-icon.png";

interface Notif { id: number; text: string; isRead: boolean; createdAt: string; }

export default function Layout({ children }: { children: ReactNode }) {
  const { user, login, logout } = useAuth();
  const { t, lang, setLang, theme, toggleTheme } = usePrefs();
  const location = useLocation();
  const navigate = useNavigate();

  const isGuest = !user;
  const isCenter = user?.role === "TrainingCenter";
  const isDoctor = user?.role === "Doctor";
  const isAdmin = user?.role === "Admin";
  const roleLabel = isCenter ? t("ტრენინგ ცენტრი", "Training Center") : isAdmin ? t("ადმინისტრატორი", "Administrator") : t("ექიმი", "Doctor");
  const initial = user?.displayName?.charAt(0) ?? "?";

  const nav = isGuest
    ? [
        { to: "/", label: t("მთავარი", "Home") },
        { to: "/centers", label: t("ტრენინგ ცენტრები", "Training Centers") },
      ]
    : isAdmin
      ? [{ to: "/", label: t("ადმინ პანელი", "Admin Panel") }, { to: "/announcements", label: t("ტრენინგები", "Trainings") }]
      : [
          { to: "/", label: t("მთავარი", "Home") },
          { to: "/centers", label: t("ტრენინგ ცენტრები", "Training Centers") },
          { to: "/announcements", label: t("ტრენინგები", "Trainings") },
          ...(isCenter ? [{ to: "/my-announcements", label: t("ჩემი განცხადებები", "My Announcements") }] : []),
          ...(isDoctor ? [{ to: "/certificates", label: t("ჩემი სერტიფიკატები", "My Certificates") }] : []),
        ];

  const [unreadMsgs, setUnreadMsgs] = useState(0);
  const [notifCount, setNotifCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const refreshBadges = async () => {
    if (!user) return;
    try {
      const [m, n] = await Promise.all([
        api.get<{ count: number }>("/chat/unread/count"),
        api.get<{ count: number }>("/notifications/unread-count"),
      ]);
      setUnreadMsgs(m.data.count);
      setNotifCount(n.data.count);
    } catch { /* ignore */ }
  };

  useEffect(() => { refreshBadges(); }, [location.pathname, user]);
  useEffect(() => {
    if (!user) return;
    const timer = setInterval(refreshBadges, 20000);
    return () => clearInterval(timer);
  }, [user]);

  const openNotifs = async () => {
    if (notifOpen) { setNotifOpen(false); return; }
    setMenuOpen(false);
    const { data } = await api.get<Notif[]>("/notifications");
    setNotifs(data);
    setNotifOpen(true);
    if (notifCount > 0) { await api.post("/notifications/read-all"); setNotifCount(0); }
  };

  const doLogout = () => { logout(); navigate("/"); };

  const submitLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      login({ token: data.token, userId: data.userId, displayName: data.displayName, role: data.role });
      setLoginOpen(false);
      setEmail("");
      setPassword("");
      navigate("/");
    } catch {
      setLoginError(t("ელფოსტა ან პაროლი არასწორია", "Invalid email or password"));
    } finally {
      setLoginLoading(false);
    }
  };

  const footerLinks = isGuest
    ? [
        { to: "/", label: t("მთავარი", "Home"), icon: <Home size={16} /> },
        { to: "/centers", label: t("ტრენინგ ცენტრები", "Training Centers"), icon: <Users size={16} /> },
      ]
    : [
        { to: "/", label: t("მთავარი", "Home"), icon: <Home size={16} /> },
        { to: "/centers", label: t("ტრენინგ ცენტრები", "Training Centers"), icon: <Users size={16} /> },
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
            <img src={logoIcon} alt="" className="logo-mark-img" />
            <span>
              <div className="logo-name">Med<span>Ter</span></div>
              <div className="logo-tag">CONNECT · DISCUSS · ADVANCE</div>
            </span>
          </Link>

          <nav className="nav">
            {nav.map((item) => {
              const active = item.to === "/centers"
                ? location.pathname === "/centers" || location.pathname.startsWith("/centers/")
                : location.pathname === item.to;
              return (
                <Link key={item.to} to={item.to} className={active ? "active" : ""}>{item.label}</Link>
              );
            })}
          </nav>

          <div className="top-actions">
            <button className="icon-btn" style={{ fontWeight: 800, fontSize: 12.5 }} onClick={() => setLang(lang === "ka" ? "en" : "ka")} title="Language">
              {lang === "ka" ? "EN" : "ქა"}
            </button>
            <button className="icon-btn" onClick={toggleTheme} title={t("თემა", "Theme")}>
              {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {user && (
              <>
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

                <Link to="/chat" className="icon-btn" aria-label={t("შეტყობინებები", "Messages")}>
                  {unreadMsgs > 0 && <span className="dot">{unreadMsgs > 9 ? "9+" : unreadMsgs}</span>}
                  <Chat size={21} />
                </Link>
              </>
            )}

            <div className="top-divider" />

            {user ? (
              <div style={{ position: "relative" }}>
                <button className="profile" onClick={() => { setMenuOpen((o) => !o); setNotifOpen(false); }}>
                  <span className="avatar">{initial}</span>
                  <span className="profile-meta">
                    <span className="name">{user.displayName}</span>
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
            ) : (
              <div style={{ position: "relative" }}>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => { setLoginOpen((o) => !o); setLoginError(""); }}
                >
                  {t("შესვლა", "Sign in")}
                </button>
                {loginOpen && (
                  <>
                    <div style={{ position: "fixed", inset: 0, zIndex: 65 }} onClick={() => setLoginOpen(false)} />
                    <div className="dropdown login-dropdown">
                      <div className="dd-title">{t("შესვლა", "Sign in")}</div>
                      <form onSubmit={submitLogin} className="login-form">
                        {loginError && <div className="auth-error" style={{ marginBottom: 10 }}>{loginError}</div>}
                        <div className="field">
                          <label>{t("ელფოსტა", "Email")}</label>
                          <input
                            className="control"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            required
                            autoFocus
                          />
                        </div>
                        <div className="field">
                          <label>{t("პაროლი", "Password")}</label>
                          <input
                            className="control"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                          />
                        </div>
                        <button className="btn btn-primary btn-block btn-sm" disabled={loginLoading}>
                          {loginLoading ? "..." : t("შესვლა", "Sign in")}
                        </button>
                        <p className="auth-foot" style={{ marginTop: 12, marginBottom: 0 }}>
                          {t("არ გაქვს ანგარიში?", "No account?")}{" "}
                          <Link to="/register" onClick={() => setLoginOpen(false)}>{t("რეგისტრაცია", "Register")}</Link>
                        </p>
                      </form>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="page">{children}</main>

      <footer className="footer">
        <div className="footer-inner">
          <div>
            <div className="foot-logo">
              <img src={logoIcon} alt="" className="logo-mark-img logo-mark-img-sm" />
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
