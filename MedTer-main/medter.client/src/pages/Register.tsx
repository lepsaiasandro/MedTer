import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";
import { useAuth } from "../auth";
import { usePrefs } from "../i18n";
import { Sun, Moon, Check } from "../components/icons";
import logoIcon from "../assets/medter-icon.png";

type Role = "TrainingCenter" | "Doctor";

const MAX_PHOTO_BYTES = 1_800_000;

function readPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("not-image"));
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      reject(new Error("too-large"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("read"));
    reader.readAsDataURL(file);
  });
}

function AuthPrefs() {
  const { lang, setLang, theme, toggleTheme, t } = usePrefs();
  return (
    <div className="auth-prefs">
      <button type="button" className="icon-btn" style={{ fontWeight: 800, fontSize: 12.5 }} onClick={() => setLang(lang === "ka" ? "en" : "ka")} title="Language">
        {lang === "ka" ? "EN" : "ქა"}
      </button>
      <button type="button" className="icon-btn" onClick={toggleTheme} title={t("თემა", "Theme")}>
        {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
      </button>
    </div>
  );
}

export default function Register() {
  const { t } = usePrefs();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>("Doctor");
  const [form, setForm] = useState({
    email: "", password: "", name: "", firstName: "", lastName: "",
    specialty: "", description: "", city: "", phone: "",
  });
  const [photoUrl, setPhotoUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const onPickPhoto = async (file?: File) => {
    if (!file) return;
    try {
      const data = await readPhoto(file);
      setPhotoUrl(data);
      setError("");
    } catch (err: any) {
      if (err?.message === "too-large")
        setError(t("ფოტო ძალიან დიდია (მაქს. ~1.8MB)", "Photo is too large (max ~1.8MB)"));
      else
        setError(t("ფოტოს ატვირთვა ვერ მოხერხდა", "Could not upload photo"));
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const url = role === "Doctor" ? "/auth/register/doctor" : "/auth/register/training-center";
      const body =
        role === "Doctor"
          ? {
              email: form.email, password: form.password,
              firstName: form.firstName, lastName: form.lastName,
              specialty: form.specialty, city: form.city, phone: form.phone,
              profilePhotoUrl: photoUrl || null,
            }
          : {
              email: form.email, password: form.password,
              name: form.name, description: form.description,
              city: form.city, phone: form.phone,
              profilePhotoUrl: photoUrl || null,
            };
      const { data } = await api.post(url, body);
      if (data?.token) {
        login({
          token: data.token,
          userId: data.userId,
          displayName: data.displayName,
          role: data.role,
          profilePhotoUrl: data.profilePhotoUrl,
        });
        navigate(data.role === "TrainingCenter" ? "/my-announcements" : "/announcements");
        return;
      }
      setDone(true);
    } catch (err: any) {
      const msg = Array.isArray(err?.response?.data) ? err.response.data.join(", ") : t("რეგისტრაცია ვერ მოხერხდა", "Registration failed");
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const previewInitial = role === "Doctor"
    ? (form.firstName || form.lastName || "?").charAt(0)
    : (form.name || "?").charAt(0);

  const brandPanel = (
    <aside className="auth-brand-panel">
      <img src={logoIcon} alt="" className="auth-brand-logo" />
      <div className="logo-name" style={{ fontSize: 28, color: "#fff" }}>Med<span style={{ color: "#93c5fd" }}>Ter</span></div>
      <p className="auth-brand-tag">CONNECT · DISCUSS · ADVANCE</p>
      <p className="auth-brand-copy">
        {t(
          "შეუერთდი ქართველ ექიმებსა და ტრენინგ ცენტრებს — ტრენინგები, უსდ ქულები და პროფესიული კომუნიკაცია.",
          "Join Georgian doctors and training centers — trainings, CPD points and professional communication."
        )}
      </p>
      <ul className="checks auth-brand-checks">
        <li><Check size={16} /> {t("ვერიფიცირებული ცენტრები", "Verified centers")}</li>
        <li><Check size={16} /> {t("უსდ ქულების აღრიცხვა", "CPD tracking")}</li>
        <li><Check size={16} /> {t("ლაივ ჩატი", "Live chat")}</li>
      </ul>
    </aside>
  );

  if (done) {
    return (
      <div className="auth-shell">
        <AuthPrefs />
        {brandPanel}
        <div className="auth-wrap auth-wrap--panel">
          <div className="auth-card" style={{ maxWidth: 460, textAlign: "center" }}>
            <div className="auth-logo auth-logo--mobile">
              <img src={logoIcon} alt="" className="logo-mark-img" />
              <span className="logo-name">Med<span>Ter</span></span>
            </div>
            <div className="auth-title">{t("განაცხადი მიღებულია", "Application received")}</div>
            <div className="auth-sub" style={{ marginBottom: 20 }}>
              {t(
                "თქვენი ანგარიში ადმინისტრატორის დამტკიცებას ელოდება. დამტკიცების შემდეგ შეძლებთ სისტემაში შესვლას.",
                "Your account is awaiting administrator approval. You can sign in once it has been approved."
              )}
            </div>
            <p style={{ fontSize: 13.5, color: "var(--muted)", marginBottom: 18 }}>{form.email}</p>
            <Link to="/" className="btn btn-primary btn-block btn-lg">{t("მთავარ გვერდზე", "Back to home")}</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-shell">
      <AuthPrefs />
      {brandPanel}
      <div className="auth-wrap auth-wrap--panel">
        <form onSubmit={submit} className="auth-card" style={{ maxWidth: 460 }}>
          <div className="auth-logo auth-logo--mobile">
            <img src={logoIcon} alt="" className="logo-mark-img" />
            <span className="logo-name">Med<span>Ter</span></span>
          </div>
          <div className="auth-title">{t("რეგისტრაცია", "Register")}</div>
          <div className="auth-sub">{t("შექმენი ანგარიში — ადმინი დაამტკიცებს შესვლამდე", "Create an account — an admin must approve before you can sign in")}</div>

          <div className="role-toggle">
            {(["Doctor", "TrainingCenter"] as Role[]).map((r) => (
              <button type="button" key={r} onClick={() => setRole(r)} className={role === r ? "active" : ""}>
                {r === "Doctor" ? t("ექიმი", "Doctor") : t("ტრენინგ ცენტრი", "Training Center")}
              </button>
            ))}
          </div>

          {error && <div className="auth-error">{error}</div>}

          <div className="field">
            <label>{t("პროფილის ფოტო", "Profile photo")}</label>
            <div className="reg-photo-pick">
              <div className="preview">
                {photoUrl ? <img src={photoUrl} alt="" /> : previewInitial}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label className="btn btn-ghost btn-sm" style={{ cursor: "pointer", width: "fit-content" }}>
                  {t("ფოტოს არჩევა", "Choose photo")}
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => onPickPhoto(e.target.files?.[0] || undefined)}
                  />
                </label>
                {photoUrl && (
                  <button type="button" className="btn btn-text btn-sm" onClick={() => setPhotoUrl("")}>
                    {t("ფოტოს წაშლა", "Remove photo")}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="field">
            <label>{t("ელფოსტა", "Email")} <span className="req">*</span></label>
            <input className="control" type="email" value={form.email} onChange={set("email")} placeholder="you@example.com" required />
          </div>
          <div className="field">
            <label>{t("პაროლი", "Password")} <span className="req">*</span></label>
            <input className="control" type="password" value={form.password} onChange={set("password")} placeholder={t("მინ. 6 სიმბოლო", "min. 6 characters")} required minLength={6} />
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
            {t("უკვე გაქვს ანგარიში?", "Already have an account?")} <Link to="/">{t("შესვლა", "Sign in")}</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
