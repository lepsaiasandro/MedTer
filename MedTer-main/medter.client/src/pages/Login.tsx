import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";
import { useAuth } from "../auth";
import { usePrefs } from "../i18n";
import logoIcon from "../assets/medter-icon.png";

export default function Login() {
  const { login } = useAuth();
  const { t } = usePrefs();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      login({ token: data.token, userId: data.userId, displayName: data.displayName, role: data.role });
      navigate("/");
    } catch {
      setError(t("ელფოსტა ან პაროლი არასწორია", "Invalid email or password"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrap">
      <form onSubmit={submit} className="auth-card">
        <div className="auth-logo">
          <img src={logoIcon} alt="" className="logo-mark-img" />
          <span className="logo-name">Med<span>Ter</span></span>
        </div>
        <div className="auth-title">{t("შესვლა", "Sign in")}</div>
        <div className="auth-sub">{t("კეთილი იყოს შენი დაბრუნება", "Welcome back")}</div>

        {error && <div className="auth-error">{error}</div>}

        <div className="field">
          <label>{t("ელფოსტა", "Email")}</label>
          <input className="control" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
        </div>
        <div className="field">
          <label>{t("პაროლი", "Password")}</label>
          <input className="control" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
        </div>

        <button className="btn btn-primary btn-block btn-lg" disabled={loading} style={{ marginTop: 4 }}>
          {loading ? "..." : t("შესვლა", "Sign in")}
        </button>

        <p className="auth-foot">
          {t("არ გაქვს ანგარიში?", "No account?")} <Link to="/register">{t("რეგისტრაცია", "Register")}</Link>
        </p>
      </form>
    </div>
  );
}
