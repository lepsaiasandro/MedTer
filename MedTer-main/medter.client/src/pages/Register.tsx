import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";
import { useAuth } from "../auth";
import { usePrefs } from "../i18n";
import { Logo } from "../components/icons";

type Role = "TrainingCenter" | "Doctor";

export default function Register() {
  const { login } = useAuth();
  const { t } = usePrefs();
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>("Doctor");
  const [form, setForm] = useState({
    email: "", password: "", name: "", firstName: "", lastName: "",
    specialty: "", description: "", city: "", phone: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const url = role === "Doctor" ? "/auth/register/doctor" : "/auth/register/training-center";
      const body =
        role === "Doctor"
          ? { email: form.email, password: form.password, firstName: form.firstName, lastName: form.lastName, specialty: form.specialty, city: form.city, phone: form.phone }
          : { email: form.email, password: form.password, name: form.name, description: form.description, city: form.city, phone: form.phone };
      const { data } = await api.post(url, body);
      login({ token: data.token, userId: data.userId, displayName: data.displayName, role: data.role });
      navigate("/");
    } catch (err: any) {
      const msg = Array.isArray(err?.response?.data) ? err.response.data.join(", ") : t("რეგისტრაცია ვერ მოხერხდა", "Registration failed");
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrap">
      <form onSubmit={submit} className="auth-card" style={{ maxWidth: 460 }}>
        <div className="auth-logo">
          <span className="logo-mark"><Logo /></span>
          <span className="logo-name">Med<span>Ter</span></span>
        </div>
        <div className="auth-title">{t("რეგისტრაცია", "Register")}</div>
        <div className="auth-sub">{t("შექმენი ანგარიში და შემოგვიერთდი", "Create an account and join us")}</div>

        <div className="role-toggle">
          {(["Doctor", "TrainingCenter"] as Role[]).map((r) => (
            <button type="button" key={r} onClick={() => setRole(r)} className={role === r ? "active" : ""}>
              {r === "Doctor" ? t("ექიმი", "Doctor") : t("ტრენინგ ცენტრი", "Training Center")}
            </button>
          ))}
        </div>

        {error && <div className="auth-error">{error}</div>}

        <div className="field">
          <label>{t("ელფოსტა", "Email")} <span className="req">*</span></label>
          <input className="control" type="email" value={form.email} onChange={set("email")} placeholder="you@example.com" required />
        </div>
        <div className="field">
          <label>{t("პაროლი", "Password")} <span className="req">*</span></label>
          <input className="control" type="password" value={form.password} onChange={set("password")} placeholder={t("მინ. 6 სიმბოლო", "min. 6 characters")} required />
        </div>

        {role === "Doctor" ? (
          <div className="field-grid">
            <div className="field"><label>{t("სახელი", "First name")} <span className="req">*</span></label><input className="control" value={form.firstName} onChange={set("firstName")} required /></div>
            <div className="field"><label>{t("გვარი", "Last name")} <span className="req">*</span></label><input className="control" value={form.lastName} onChange={set("lastName")} required /></div>
            <div className="field" style={{ gridColumn: "1 / -1" }}><label>{t("სპეციალობა", "Specialty")}</label><input className="control" value={form.specialty} onChange={set("specialty")} placeholder={t("მაგ: კარდიოლოგი", "e.g. cardiologist")} /></div>
          </div>
        ) : (
          <>
            <div className="field"><label>{t("ცენტრის სახელი", "Center name")} <span className="req">*</span></label><input className="control" value={form.name} onChange={set("name")} required /></div>
            <div className="field"><label>{t("აღწერა", "Description")}</label><input className="control" value={form.description} onChange={set("description")} /></div>
          </>
        )}

        <div className="field-grid">
          <div className="field"><label>{t("ქალაქი", "City")}</label><input className="control" value={form.city} onChange={set("city")} /></div>
          <div className="field"><label>{t("ტელეფონი", "Phone")}</label><input className="control" value={form.phone} onChange={set("phone")} /></div>
        </div>

        <button className="btn btn-primary btn-block btn-lg" disabled={loading} style={{ marginTop: 4 }}>
          {loading ? "..." : t("რეგისტრაცია", "Register")}
        </button>

        <p className="auth-foot">
          {t("უკვე გაქვს ანგარიში?", "Already have an account?")} <Link to="/login">{t("შესვლა", "Sign in")}</Link>
        </p>
      </form>
    </div>
  );
}
