import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../api";
import { useAuth } from "../auth";
import { usePrefs } from "../i18n";
import { Sun, Moon, Check, Cap, Stethoscope, ArrowLeft } from "../components/icons";
import LinearAdBanner from "../components/LinearAdBanner";
import logoIcon from "../assets/medter-icon.png";

type Role = "TrainingCenter" | "Doctor";
type Step = 1 | 2;

function roleFromQuery(value: string | null): Role | null {
  if (value === "doctor") return "Doctor";
  if (value === "center" || value === "training-center") return "TrainingCenter";
  return null;
}

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

function Stepper({ step }: { step: Step }) {
  const { t } = usePrefs();
  return (
    <div className="auth-stepper" aria-label={t("რეგისტრაციის ნაბიჯები", "Registration steps")}>
      <div className={`auth-step ${step >= 1 ? "active" : ""} ${step > 1 ? "done" : ""}`}>
        <span className="auth-step-num">{step > 1 ? <Check size={14} /> : "1"}</span>
        <span className="auth-step-label">{t("ვინ ხარ?", "Who are you?")}</span>
      </div>
      <div className={`auth-step-line ${step > 1 ? "active" : ""}`} />
      <div className={`auth-step ${step >= 2 ? "active" : ""}`}>
        <span className="auth-step-num">2</span>
        <span className="auth-step-label">{t("დეტალები", "Details")}</span>
      </div>
    </div>
  );
}

export default function Register() {
  const { t } = usePrefs();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<Step>(1);
  const [role, setRole] = useState<Role | null>(() => roleFromQuery(searchParams.get("role")));
  const [form, setForm] = useState({
    email: "", password: "", name: "", firstName: "", lastName: "",
    specialty: "", description: "", city: "", phone: "",
  });
  const [photoUrl, setPhotoUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const fromQuery = roleFromQuery(searchParams.get("role"));
    if (fromQuery) setRole(fromQuery);
  }, [searchParams]);

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

  const goNext = () => {
    if (!role) {
      setError(t("აირჩიე ანგარიშის ტიპი", "Choose an account type"));
      return;
    }
    setError("");
    setStep(2);
  };

  const goBack = () => {
    setError("");
    setStep(1);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) return;
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
      const token = data?.token ?? data?.Token;
      if (token) {
        const nextRole = data.role ?? data.Role;
        login({
          token,
          userId: data.userId ?? data.UserId,
          displayName: data.displayName ?? data.DisplayName,
          role: nextRole,
          profilePhotoUrl: data.profilePhotoUrl ?? data.ProfilePhotoUrl,
        });
        navigate(
          "/announcements?welcome=1",
          { replace: true }
        );
        return;
      }
      setDone(true);
    } catch (err: any) {
      const raw = err?.response?.data;
      const msg = Array.isArray(raw)
        ? raw.map((x: any) => (typeof x === "string" ? x : x?.description || x?.Description || String(x))).join(", ")
        : typeof raw?.message === "string"
          ? raw.message
          : typeof raw === "string"
            ? raw
            : t("რეგისტრაცია ვერ მოხერხდა", "Registration failed");
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
      <div className="auth-brand-top">
        <img src={logoIcon} alt="" className="auth-brand-logo" />
        <div className="logo-name" style={{ fontSize: 26, color: "#fff" }}>Med<span style={{ color: "#93c5fd" }}>Ter</span></div>
      </div>
      <h1 className="auth-brand-headline">
        {t(
          "შეუერთდი ქართველ ექიმებსა და ტრენინგ ცენტრებს",
          "Join Georgian doctors and training centers"
        )}
      </h1>
      <p className="auth-brand-copy">
        {t(
          "ტრენინგები, უპგ ქულები და პროფესიული კომუნიკაცია — ერთ სივრცეში.",
          "Trainings, CPD points and professional communication — in one place."
        )}
      </p>
      <ul className="auth-brand-features">
        <li><Check size={16} /> {t("ვერიფიცირებული ცენტრები", "Verified centers")}</li>
        <li><Check size={16} /> {t("კოლეგებთან კომუნიკაცია", "Communication with colleagues")}</li>
        <li><Check size={16} /> {t("ლაივ ჩატი და რესურსები", "Live chat and resources")}</li>
      </ul>
      <p className="auth-brand-foot">© MedTer</p>
    </aside>
  );

  const leave = () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx;
    if (typeof idx === "number" && idx > 0) navigate(-1);
    else navigate("/");
  };

  if (done) {
    return (
      <div className="auth-shell">
        <button type="button" className="auth-page-back" onClick={leave}>
          <ArrowLeft size={16} />
          {t("უკან", "Back")}
        </button>
        <AuthPrefs />
        {brandPanel}
        <div className="auth-wrap auth-wrap--panel">
          <div className="auth-panel-col">
            <LinearAdBanner compact />
            <div className="auth-card" style={{ textAlign: "center" }}>
              <div className="auth-logo auth-logo--mobile">
                <img src={logoIcon} alt="" className="logo-mark-img" />
                <span className="logo-name">Med<span>Ter</span></span>
              </div>
              <div className="auth-success-icon" aria-hidden="true">
                <Check size={28} />
              </div>
              <div className="auth-title">{t("განაცხადი მიღებულია", "Application received")}</div>
              <div className="auth-sub" style={{ marginBottom: 16 }}>
                {t(
                  "რეგისტრაცია წარმატებით გაიგზავნა. ანგარიში ადმინის დამტკიცებას ელოდება — შემდეგ შეძლებთ შესვლას.",
                  "Registration submitted successfully. Your account awaits admin approval — then you can sign in."
                )}
              </div>
              <p style={{ fontSize: 13.5, color: "var(--muted)", marginBottom: 14 }}>
                {t("ელფოსტა", "Email")}: <b style={{ color: "var(--text)" }}>{form.email}</b>
              </p>
              <ul className="auth-success-steps">
                <li>
                  <span className="n">1</span>
                  {t("ადმინი განიხილავს თქვენს განაცხადს", "An admin will review your application")}
                </li>
                <li>
                  <span className="n">2</span>
                  {t("დამტკიცების შემდეგ შედით იმავე ელფოსტით", "After approval, sign in with the same email")}
                </li>
                <li>
                  <span className="n">3</span>
                  {role === "Doctor"
                    ? t("დაიწყეთ ტრენინგების ძიება და რეგისტრაცია", "Start browsing and registering for trainings")
                    : t("შექმენით და გამოაქვეყნეთ ტრენინგები", "Create and publish trainings")}
                </li>
              </ul>
              <Link to="/" className="btn btn-primary btn-block btn-lg">{t("მთავარ გვერდზე", "Back to home")}</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-shell">
      <button type="button" className="auth-page-back" onClick={leave}>
        <ArrowLeft size={16} />
        {t("უკან", "Back")}
      </button>
      <AuthPrefs />
      {brandPanel}
      <div className="auth-wrap auth-wrap--panel">
        <div className="auth-panel-col">
          <LinearAdBanner compact />
          <div className="auth-card">
            <div className="auth-logo auth-logo--mobile">
              <img src={logoIcon} alt="" className="logo-mark-img" />
              <span className="logo-name">Med<span>Ter</span></span>
            </div>

            <Stepper step={step} />

            <div className="auth-title">{t("რეგისტრაცია", "Registration")}</div>
            <div className="auth-sub">
              {step === 1
                ? t(
                    "აირჩიე ანგარიშის ტიპი. ადმინი დაამტკიცებს შესვლამდე.",
                    "Choose an account type. An admin must approve before you can sign in."
                  )
                : role === "Doctor"
                  ? t("შეავსე ექიმის პროფილის დეტალები", "Fill in your doctor profile details")
                  : t("შეავსე ტრენინგ ცენტრის დეტალები", "Fill in your training center details")}
            </div>

            {error && <div className="auth-error">{error}</div>}

            {step === 1 ? (
              <>
                <div className="role-pick" role="radiogroup" aria-label={t("ანგარიშის ტიპი", "Account type")}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={role === "Doctor"}
                    className={`role-pick-card ${role === "Doctor" ? "selected" : ""}`}
                    onClick={() => { setRole("Doctor"); setError(""); }}
                  >
                    {role === "Doctor" && (
                      <span className="role-pick-check" aria-hidden="true"><Check size={14} /></span>
                    )}
                    <span className="role-pick-icon"><Stethoscope size={28} /></span>
                    <span className="role-pick-body">
                      <span className="role-pick-title">{t("ექიმი", "Doctor")}</span>
                      <span className="role-pick-desc">
                        {t("სპეციალისტი, რეზიდენტი ან სტუდენტი", "Specialist, resident, or student")}
                      </span>
                    </span>
                  </button>

                  <button
                    type="button"
                    role="radio"
                    aria-checked={role === "TrainingCenter"}
                    className={`role-pick-card ${role === "TrainingCenter" ? "selected" : ""}`}
                    onClick={() => { setRole("TrainingCenter"); setError(""); }}
                  >
                    {role === "TrainingCenter" && (
                      <span className="role-pick-check" aria-hidden="true"><Check size={14} /></span>
                    )}
                    <span className="role-pick-icon"><Cap size={28} /></span>
                    <span className="role-pick-body">
                      <span className="role-pick-title">{t("ტრენინგ ცენტრი", "Training center")}</span>
                      <span className="role-pick-desc">
                        {t("კურსებისა და ტრენინგების პროვაიდერი", "Provider of courses and trainings")}
                      </span>
                    </span>
                  </button>
                </div>

                <button
                  type="button"
                  className="btn btn-primary btn-block btn-lg"
                  disabled={!role}
                  onClick={goNext}
                  style={{ marginTop: 4 }}
                >
                  {t("გაგრძელება", "Continue")}
                </button>
              </>
            ) : (
              <form onSubmit={submit}>
                <button type="button" className="auth-back" onClick={goBack}>
                  <ArrowLeft size={16} />
                  {t("უკან", "Back")}
                </button>

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
              </form>
            )}

            <p className="auth-foot">
              {t("უკვე გაქვს ანგარიში?", "Already have an account?")} <Link to="/">{t("შესვლა", "Sign in")}</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
