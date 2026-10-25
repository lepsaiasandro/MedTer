import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import api from "../api";
import { useAuth } from "../auth";
import { usePrefs } from "../i18n";
import CenterSubscription from "../components/CenterSubscription";
import { Calendar, Cap, Check, Doc, Mail, Pin, Trophy, Users } from "../components/icons";

type ProfileSection =
  | "info"
  | "progress"
  | "certificates"
  | "overview"
  | "subscription"
  | "payment"
  | "account"
  | "admin";

function sectionFromHash(hash: string, allowed: ProfileSection[]): ProfileSection {
  const id = (hash.replace(/^#/, "") || "info") as ProfileSection;
  return allowed.includes(id) ? id : "info";
}

interface ProfileCertificate {
  id: number;
  title: string;
  points: number;
  centerName: string;
  issuedAt: string;
  fileUrl?: string;
  fileName?: string;
}

interface PendingChange {
  id: number;
  firstName?: string;
  lastName?: string;
  specialty?: string;
  centerName?: string;
  description?: string;
  city?: string;
  phone?: string;
  submittedAt: string;
}

interface MeProfile {
  userId: string;
  email: string;
  displayName: string;
  role: string;
  isApproved: boolean;
  createdAt: string;
  firstName?: string;
  lastName?: string;
  specialty?: string;
  centerName?: string;
  description?: string;
  city?: string;
  phone?: string;
  totalPoints: number;
  certificateCount: number;
  leaderboardRank?: number | null;
  interestsCount: number;
  announcementsPublished: number;
  announcementsPending: number;
  averageRating: number;
  ratingCount: number;
  certificates: ProfileCertificate[];
  pendingChange?: PendingChange | null;
  verificationStatus?: string;
  profilePhotoUrl?: string | null;
  rejectionReason?: string | null;
}

interface EditForm {
  firstName: string;
  lastName: string;
  specialty: string;
  centerName: string;
  description: string;
  city: string;
  phone: string;
}

const GOAL = 50;
const MONTHS_KA = ["იანვარი", "თებერვალი", "მარტი", "აპრილი", "მაისი", "ივნისი", "ივლისი", "აგვისტო", "სექტემბერი", "ოქტომბერი", "ნოემბერი", "დეკემბერი"];
const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function formFromProfile(p: MeProfile): EditForm {
  return {
    firstName: p.firstName ?? "",
    lastName: p.lastName ?? "",
    specialty: p.specialty ?? "",
    centerName: p.centerName ?? "",
    description: p.description ?? "",
    city: p.city ?? "",
    phone: p.phone ?? "",
  };
}

export default function Profile() {
  const { user, updateUser } = useAuth();
  const { t, lang } = usePrefs();
  const location = useLocation();
  const [profile, setProfile] = useState<MeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [section, setSection] = useState<ProfileSection>("info");

  const load = () =>
    api.get<MeProfile>("/users/me")
      .then((r) => {
        setProfile(r.data);
        setForm(formFromProfile(r.data));
        if (r.data.profilePhotoUrl !== undefined) {
          updateUser({ profilePhotoUrl: r.data.profilePhotoUrl ?? null });
        }
      })
      .catch(() => setProfile(null));

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const navItems = useMemo(() => {
    if (!profile) return [] as { id: ProfileSection; label: string; icon: ReactNode }[];
    const doctor = profile.role === "Doctor";
    const center = profile.role === "TrainingCenter";
    const admin = profile.role === "Admin";
    const items: { id: ProfileSection; label: string; icon: ReactNode }[] = [
      { id: "info", label: t("ინფორმაცია", "Information"), icon: <Users size={17} /> },
    ];
    if (doctor) {
      items.push(
        { id: "progress", label: t("პროგრესი", "Progress"), icon: <Trophy size={17} /> },
        { id: "certificates", label: t("სერტიფიკატები", "Certificates"), icon: <Doc size={17} sw={2} /> },
      );
    }
    if (center) {
      items.push(
        { id: "overview", label: t("მიმოხილვა", "Overview"), icon: <Cap size={17} /> },
        { id: "subscription", label: t("გამოწერა", "Subscription"), icon: <Check size={17} /> },
        { id: "payment", label: t("გადახდის მეთოდები", "Payment methods"), icon: <Doc size={17} sw={2} /> },
      );
    }
    if (admin) {
      items.push({ id: "admin", label: t("ადმინისტრატორი", "Administrator"), icon: <Check size={17} /> });
    }
    items.push({ id: "account", label: t("ანგარიში", "Account"), icon: <Mail size={17} /> });
    return items;
  }, [profile, t]);

  const allowedSections = useMemo(() => navItems.map((n) => n.id), [navItems]);

  useEffect(() => {
    if (!profile || allowedSections.length === 0) return;
    setSection(sectionFromHash(location.hash, allowedSections));
  }, [location.hash, profile, allowedSections]);

  const goSection = (id: ProfileSection) => {
    setSection(id);
    window.history.replaceState(null, "", `${location.pathname}${location.search}#${id}`);
  };

  const fmtDate = (iso?: string) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (isNaN(d.getTime()) || d.getFullYear() < 2000) return "—";
    return `${d.getDate()} ${(lang === "en" ? MONTHS_EN : MONTHS_KA)[d.getMonth()]}, ${d.getFullYear()}`;
  };

  const startEdit = () => {
    if (!profile) return;
    setForm(formFromProfile(profile));
    setError("");
    setSuccess("");
    setEditing(true);
    goSection("info");
  };

  const cancelEdit = () => {
    if (profile) setForm(formFromProfile(profile));
    setEditing(false);
    setError("");
  };

  const submitChange = async (e: FormEvent) => {
    e.preventDefault();
    if (!form || !profile) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const body = profile.role === "Doctor"
        ? {
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim(),
            specialty: form.specialty.trim() || null,
            city: form.city.trim() || null,
            phone: form.phone.trim() || null,
          }
        : {
            centerName: form.centerName.trim(),
            description: form.description.trim() || null,
            city: form.city.trim() || null,
            phone: form.phone.trim() || null,
          };
      await api.put("/users/me", body);
      setSuccess(t(
        "ცვლილება გაგზავნილია ადმინისტრატორთან დასამტკიცებლად.",
        "Changes submitted for administrator approval."
      ));
      setEditing(false);
      await load();
    } catch (err: any) {
      const msg = err?.response?.data;
      setError(typeof msg === "string" ? msg : t("შენახვა ვერ მოხერხდა", "Could not save"));
    } finally {
      setSaving(false);
    }
  };

  const cancelPending = async () => {
    if (!confirm(t("გააუქმო მოლოდინში მყოფი ცვლილება?", "Cancel the pending change?"))) return;
    try {
      await api.delete("/users/me/pending-change");
      setSuccess(t("მოთხოვნა გაუქმდა", "Request cancelled"));
      await load();
    } catch {
      setError(t("გაუქმება ვერ მოხერხდა", "Could not cancel"));
    }
  };

  const savePhoto = async (dataUrl: string | null) => {
    setPhotoBusy(true);
    setError("");
    try {
      const { data } = await api.put<{ profilePhotoUrl?: string | null }>("/users/me/photo", {
        profilePhotoUrl: dataUrl,
      });
      const url = data.profilePhotoUrl ?? null;
      setProfile((p) => (p ? { ...p, profilePhotoUrl: url } : p));
      updateUser({ profilePhotoUrl: url });
      setSuccess(dataUrl
        ? t("პროფილის ფოტო განახლდა", "Profile photo updated")
        : t("პროფილის ფოტო წაიშალა", "Profile photo removed"));
    } catch (err: any) {
      const msg = err?.response?.data;
      setError(typeof msg === "string" ? msg : t("ფოტოს შენახვა ვერ მოხერხდა", "Could not save photo"));
    } finally {
      setPhotoBusy(false);
    }
  };

  const onPickPhoto = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError(t("აირჩიე სურათის ფაილი", "Choose an image file"));
      return;
    }
    if (file.size > 1_800_000) {
      setError(t("ფოტო ძალიან დიდია (მაქს. ~1.8MB)", "Photo is too large (max ~1.8MB)"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => { void savePhoto(String(reader.result)); };
    reader.readAsDataURL(file);
  };

  if (loading) {
    return <div className="empty"><p>{t("იტვირთება…", "Loading…")}</p></div>;
  }

  if (!profile) {
    return (
      <div className="empty">
        <h2>{t("პროფილი ვერ ჩაიტვირთა", "Could not load profile")}</h2>
        <p>{t("სცადე ხელახლა ან შეხვიდი თავიდან.", "Try again or sign in again.")}</p>
      </div>
    );
  }

  const isDoctor = profile.role === "Doctor";
  const isCenter = profile.role === "TrainingCenter";
  const isAdmin = profile.role === "Admin";
  const canEdit = (isDoctor || isCenter) && profile.isApproved;
  const points = profile.totalPoints;
  const pct = Math.min(100, Math.round((points / GOAL) * 100));
  const r = 58;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const initial = profile.displayName.charAt(0);
  const roleLabel = isCenter
    ? t("ტრენინგ ცენტრი", "Training Center")
    : isAdmin
      ? t("ადმინისტრატორი", "Administrator")
      : t("ექიმი", "Doctor");
  const pending = profile.pendingChange;
  const status = profile.verificationStatus
    || (profile.isApproved ? "Approved" : "Pending");
  const statusLabel =
    status === "Approved" ? t("დამტკიცებული", "Approved")
    : status === "Rejected" ? t("უარყოფილი", "Rejected")
    : status === "Suspended" ? t("შეჩერებული", "Suspended")
    : t("მოლოდინში", "Pending");
  const statusColor =
    status === "Approved" ? "var(--teal)"
    : status === "Rejected" ? "var(--danger)"
    : "var(--warning)";

  const activeNav = navItems.find((n) => n.id === section) ?? navItems[0];

  return (
    <div>
      <div className="page-head">
        <div className="h-text">
          <h1>{t("ჩემი პროფილი", "My Profile")}</h1>
          <p>{t("პირადი ინფორმაცია, გამოწერა და ანგარიშის პარამეტრები", "Personal info, subscription and account settings")}</p>
        </div>
        {canEdit && !editing && section === "info" && (
          <button className="btn btn-primary" type="button" onClick={startEdit}>
            {t("ინფორმაციის შეცვლა", "Edit information")}
          </button>
        )}
      </div>

      {error && <div className="auth-error" style={{ marginBottom: 16 }}>{error}</div>}
      {success && <div className="admin-success" style={{ marginBottom: 16 }}>{success}</div>}

      <div className="profile-settings">
        <aside className="profile-side">
          <div className="profile-side-title">{t("სექციები", "Sections")}</div>
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`profile-nav-item ${section === item.id ? "active" : ""}`}
              onClick={() => goSection(item.id)}
            >
              <span className="ic">{item.icon}</span>
              <span className="lbl">{item.label}</span>
            </button>
          ))}
        </aside>

        <section className="profile-main">
          <div className="profile-section-head">
            <h2>{activeNav?.label}</h2>
          </div>

          {section === "info" && (
            <>
          {pending && !editing && (
          <div className="card" style={{ padding: 18, marginBottom: 20, borderColor: "var(--warning)", background: "var(--warning-soft)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>
                  {t("ცვლილება ელოდება ადმინის დამტკიცებას", "Change awaiting admin approval")}
                </div>
                <div style={{ fontSize: 13.5, color: "var(--muted)", lineHeight: 1.5 }}>
                  {isDoctor && (
                    <>
                      {[pending.firstName, pending.lastName].filter(Boolean).join(" ")}
                      {pending.specialty ? ` · ${pending.specialty}` : ""}
                      {pending.city ? ` · ${pending.city}` : ""}
                      {pending.phone ? ` · ${pending.phone}` : ""}
                    </>
                  )}
                  {isCenter && (
                    <>
                      {pending.centerName}
                      {pending.city ? ` · ${pending.city}` : ""}
                      {pending.phone ? ` · ${pending.phone}` : ""}
                      {pending.description ? ` — ${pending.description}` : ""}
                    </>
                  )}
                </div>
                <div style={{ fontSize: 12.5, color: "var(--soft)", marginTop: 6 }}>{fmtDate(pending.submittedAt)}</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-ghost btn-sm" type="button" onClick={startEdit}>
                  {t("განახლება", "Update")}
                </button>
                <button className="btn btn-ghost btn-sm" type="button" style={{ color: "var(--danger)" }} onClick={cancelPending}>
                  {t("გაუქმება", "Cancel")}
                </button>
              </div>
            </div>
          </div>
          )}
          {editing && form && (
          <form className="card" style={{ padding: 24, marginBottom: 20 }} onSubmit={submitChange}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", margin: "0 0 6px" }}>
              {t("პროფილის რედაქტირება", "Edit profile")}
            </h3>
            <p style={{ fontSize: 13.5, color: "var(--muted)", margin: "0 0 18px" }}>
              {t(
                "ცვლილებები გამოქვეყნდება მხოლოდ ადმინისტრატორის დამტკიცების შემდეგ.",
                "Changes will go live only after administrator approval."
              )}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
              {isDoctor && (
                <>
                  <div className="field">
                    <label>{t("სახელი", "First name")} <span className="req">*</span></label>
                    <input className="control" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
                  </div>
                  <div className="field">
                    <label>{t("გვარი", "Last name")} <span className="req">*</span></label>
                    <input className="control" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
                  </div>
                  <div className="field">
                    <label>{t("სპეციალობა", "Specialty")}</label>
                    <input className="control" value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} />
                  </div>
                </>
              )}
              {isCenter && (
                <>
                  <div className="field" style={{ gridColumn: "1 / -1" }}>
                    <label>{t("ცენტრის სახელი", "Center name")} <span className="req">*</span></label>
                    <input className="control" value={form.centerName} onChange={(e) => setForm({ ...form, centerName: e.target.value })} required />
                  </div>
                  <div className="field" style={{ gridColumn: "1 / -1" }}>
                    <label>{t("აღწერა", "Description")}</label>
                    <textarea className="control" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                  </div>
                </>
              )}
              <div className="field">
                <label>{t("ქალაქი", "City")}</label>
                <input className="control" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
              <div className="field">
                <label>{t("ტელეფონი", "Phone")}</label>
                <input className="control" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
              <button className="btn btn-text" type="button" onClick={cancelEdit} disabled={saving}>{t("გაუქმება", "Cancel")}</button>
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? "…" : t("გაგზავნა დასამტკიცებლად", "Submit for approval")}
              </button>
            </div>
          </form>
          )}
            <div className="card" style={{ padding: 24 }}>
              <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
                <div>
                  <div className="profile-photo">
                    {profile.profilePhotoUrl
                      ? <img src={profile.profilePhotoUrl} alt="" />
                      : initial}
                  </div>
                  {!isAdmin && (
                    <div className="profile-photo-actions">
                      <label className="btn btn-ghost btn-sm" style={{ cursor: photoBusy ? "wait" : "pointer" }}>
                        {photoBusy ? "…" : t("ფოტოს შეცვლა", "Change photo")}
                        <input
                          type="file"
                          accept="image/*"
                          hidden
                          disabled={photoBusy}
                          onChange={(e) => onPickPhoto(e.target.files?.[0] || undefined)}
                        />
                      </label>
                      {profile.profilePhotoUrl && (
                        <button
                          type="button"
                          className="btn btn-text btn-sm"
                          disabled={photoBusy}
                          onClick={() => void savePhoto(null)}
                        >
                          {t("წაშლა", "Remove")}
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", lineHeight: 1.2 }}>{profile.displayName}</div>
                  <div style={{ marginTop: 6, fontSize: 13.5, color: "var(--muted)", fontWeight: 600 }}>{roleLabel}</div>
                  <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 8 }}>
                    <span className="chip-cat" style={{ margin: 0 }}>{profile.email}</span>
                    {profile.specialty && <span className="chip-cat" style={{ margin: 0 }}>{profile.specialty}</span>}
                    {profile.city && <span className="chip-cat" style={{ margin: 0 }}><Pin size={12} /> {profile.city}</span>}
                  </div>
                </div>
              </div>

              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: 12,
                marginTop: 22,
                paddingTop: 18,
                borderTop: "1px solid var(--border)",
              }}>
                {profile.phone && (
                  <div>
                    <div style={{ fontSize: 11.5, color: "var(--soft)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>{t("ტელეფონი", "Phone")}</div>
                    <div style={{ marginTop: 4, fontWeight: 650, color: "var(--text-body)" }}>{profile.phone}</div>
                  </div>
                )}
                <div>
                  <div style={{ fontSize: 11.5, color: "var(--soft)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>{t("რეგისტრაცია", "Joined")}</div>
                  <div style={{ marginTop: 4, fontWeight: 650, color: "var(--text-body)" }}>{fmtDate(profile.createdAt)}</div>
                </div>
                {isDoctor && profile.firstName && (
                  <div>
                    <div style={{ fontSize: 11.5, color: "var(--soft)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>{t("სახელი / გვარი", "Name")}</div>
                    <div style={{ marginTop: 4, fontWeight: 650, color: "var(--text-body)" }}>{profile.firstName} {profile.lastName}</div>
                  </div>
                )}
              </div>

              {isCenter && profile.description && (
                <p style={{ marginTop: 18, fontSize: 14, color: "var(--muted)", lineHeight: 1.55 }}>{profile.description}</p>
              )}
            </div>
            </>
          )}

          {section === "progress" && isDoctor && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div className="stats" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
                  <div className="stat">
                    <div className="k"><span className="ic" style={{ background: "var(--teal-soft)", color: "var(--teal)" }}><Check size={15} /></span> {t("უსდ ქულა", "CPD points")}</div>
                    <div className="v">{profile.totalPoints}</div>
                  </div>
                  <div className="stat">
                    <div className="k"><span className="ic" style={{ background: "var(--brand-soft)", color: "var(--brand)" }}><Doc size={15} sw={2} /></span> {t("სერტიფიკატები", "Certificates")}</div>
                    <div className="v">{profile.certificateCount}</div>
                  </div>
                  <div className="stat">
                    <div className="k"><span className="ic" style={{ background: "var(--warning-soft)", color: "var(--warning)" }}><Trophy size={15} /></span> {t("რეიტინგი", "Rank")}</div>
                    <div className="v">{profile.leaderboardRank ?? "—"}</div>
                  </div>
                </div>
              <div className="ring-card">
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 16 }}>{t("ჩემი პროგრესი", "My Progress")}</h3>
                <div className="ring-wrap">
                  <div className="progress-ring">
                    <svg width="150" height="150" viewBox="0 0 150 150" style={{ transform: "rotate(-90deg)", border: "none", outline: "none" }}>
                      <circle cx="75" cy="75" r={r} fill="none" stroke="var(--border)" strokeWidth="10" />
                      <circle cx="75" cy="75" r={r} fill="none" stroke="var(--teal)" strokeWidth="10" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} />
                    </svg>
                    <div className="center">
                      <div>
                        <div className="num">{points} <small>/ {GOAL}</small></div>
                        <div className="cap">{t("ქულა", "points")}</div>
                      </div>
                    </div>
                  </div>
                </div>
                <p style={{ fontSize: 13, color: "var(--muted)", textAlign: "center", marginTop: 14 }}>
                  {points >= GOAL
                    ? t("წლიური მიზანი მიღწეულია 🎉", "Annual goal reached 🎉")
                    : <>{t("საჭიროა კიდევ", "You need")} <b style={{ color: "var(--text)" }}>{GOAL - points} {t("ქულა", "points")}</b> {t("წლიურ მიზნამდე", "to reach the goal")}</>}
                </p>
                {profile.interestsCount > 0 && (
                  <Link
                    to="/announcements?mine=1"
                    style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border)", fontSize: 13.5, color: "var(--muted)", display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}
                  >
                    <Users size={16} /> {t("ჩემი ტრენინგები", "My trainings")}: <b style={{ color: "var(--text)" }}>{profile.interestsCount}</b>
                  </Link>
                )}
              </div>
            </div>
          )}

          {section === "certificates" && isDoctor && (
              <div className="card" style={{ padding: 20 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", margin: "0 0 14px" }}>{t("ჩემი სერტიფიკატები", "My Certificates")}</h3>
                  {profile.certificates.length === 0 ? (
                    <p style={{ fontSize: 13.5, color: "var(--soft)", margin: 0 }}>
                      {t("ჯერ არ გაქვს სერტიფიკატი — ტრენინგების გავლის შემდეგ აქ გამოჩნდება.", "No certificates yet — they appear here after trainings.")}
                    </p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {profile.certificates.map((c) => (
                        <div key={c.id} className="cert" style={{ alignItems: "flex-start" }}>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontWeight: 650, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</div>
                            <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 3, display: "flex", flexWrap: "wrap", gap: 8 }}>
                              <span>{c.centerName}</span>
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Calendar size={12} /> {fmtDate(c.issuedAt)}</span>
                              {c.fileUrl && (
                                <a href={c.fileUrl} target="_blank" rel="noreferrer" style={{ color: "var(--brand)" }}>
                                  {t("ფაილი", "File")}
                                </a>
                              )}
                            </div>
                          </div>
                          <span className="plus">+{c.points}</span>
                        </div>
                      ))}
                    </div>
                  )}
              </div>
          )}

          {section === "overview" && isCenter && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div className="stats" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
                  <div className="stat">
                    <div className="k"><span className="ic" style={{ background: "var(--teal-soft)", color: "var(--teal)" }}><Cap size={15} /></span> {t("გამოქვეყნებული", "Published")}</div>
                    <div className="v">{profile.announcementsPublished}</div>
                  </div>
                  <div className="stat">
                    <div className="k"><span className="ic" style={{ background: "var(--warning-soft)", color: "var(--warning)" }}><Doc size={15} sw={2} /></span> {t("განხილვაში", "Pending")}</div>
                    <div className="v">{profile.announcementsPending}</div>
                  </div>
                  <div className="stat">
                    <div className="k"><span className="ic" style={{ background: "var(--brand-soft)", color: "var(--brand)" }}><Trophy size={15} /></span> {t("რეიტინგი", "Rating")}</div>
                    <div className="v">{profile.ratingCount ? profile.averageRating.toFixed(1) : "—"}</div>
                  </div>
                </div>
              <div className="card" style={{ padding: 20 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 10 }}>{t("სწრაფი ბმულები", "Quick links")}</h3>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                    <Link to="/announcements" className="btn btn-primary btn-sm">{t("ტრენინგები", "Trainings")}</Link>
                    <Link to="/chat" className="btn btn-ghost btn-sm">{t("შეტყობინებები", "Messages")}</Link>
                  </div>
                  {profile.ratingCount > 0 && (
                    <p style={{ marginTop: 14, fontSize: 13.5, color: "var(--muted)" }}>
                      {t("შეფასებები", "Ratings")}: <b style={{ color: "var(--text)" }}>{profile.averageRating.toFixed(1)}</b> / 5 ({profile.ratingCount})
                    </p>
                  )}
              </div>
            </div>
          )}

          {section === "subscription" && isCenter && (
            <CenterSubscription />
          )}

          {section === "payment" && isCenter && (
            <div id="payment" className="card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", margin: "0 0 8px" }}>
                {t("გადახდის მეთოდები", "Payment methods")}
              </h3>
              <p style={{ fontSize: 13.5, color: "var(--muted)", margin: "0 0 16px", lineHeight: 1.55 }}>
                {t(
                  "ბარათები და გადახდები მუშავდება Stripe-ის მეშვეობით. ახალი ბარათის დამატება ან არსებულის განახლება ხდება Checkout-ის დროს.",
                  "Cards and payments are handled via Stripe. Add or update a card during Checkout."
                )}
              </p>
              <ul style={{
                margin: "0 0 18px",
                paddingLeft: 18,
                color: "var(--text-body)",
                lineHeight: 1.65,
                fontSize: 13.5,
              }}>
                <li>{t("უსაფრთხო გადახდა Stripe Checkout-ით", "Secure payment via Stripe Checkout")}</li>
                <li>{t("ბარათის მონაცემები MedTer-ზე არ ინახება", "Card details are not stored on MedTer")}</li>
                <li>{t("გამოწერის მართვა — გამოწერის სექციიდან", "Manage subscription from the Subscription section")}</li>
              </ul>
              <button className="btn btn-primary btn-sm" type="button" onClick={() => goSection("subscription")}>
                {t("გამოწერაზე გადასვლა", "Go to subscription")}
              </button>
            </div>
          )}

          {section === "admin" && isAdmin && (
              <div className="card" style={{ padding: 20 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 10 }}>{t("ადმინისტრატორი", "Administrator")}</h3>
                <p style={{ fontSize: 13.5, color: "var(--muted)", marginBottom: 14 }}>
                  {t("შეგიძლია დაამტკიცო მომხმარებლები და განცხადებები ადმინ პანელიდან.", "Approve users and announcements from the admin panel.")}
                </p>
                <Link to="/" className="btn btn-primary btn-sm">{t("ადმინ პანელი", "Admin Panel")}</Link>
              </div>
          )}

          {section === "account" && (
              <div className="card" style={{ padding: 20 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 12 }}>{t("ანგარიშის დეტალები", "Account details")}</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 13.5 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <span style={{ color: "var(--muted)", display: "inline-flex", alignItems: "center", gap: 6 }}><Mail size={14} /> {t("ელფოსტა", "Email")}</span>
                  <span style={{ fontWeight: 650, color: "var(--text)", textAlign: "right", wordBreak: "break-all" }}>{profile.email}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <span style={{ color: "var(--muted)" }}>{t("როლი", "Role")}</span>
                  <span style={{ fontWeight: 650, color: "var(--text)" }}>{roleLabel}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <span style={{ color: "var(--muted)" }}>{t("სტატუსი", "Status")}</span>
                  <span style={{ fontWeight: 650, color: statusColor }}>
                    {statusLabel}
                  </span>
                </div>
                {profile.rejectionReason && (status === "Rejected" || status === "Suspended") && (
                  <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.45 }}>
                    <b style={{ color: "var(--text)" }}>{t("მიზეზი", "Reason")}:</b> {profile.rejectionReason}
                  </div>
                )}
                {user?.userId && (
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <span style={{ color: "var(--muted)" }}>{t("ID", "ID")}</span>
                    <span style={{ fontWeight: 600, color: "var(--soft)", fontSize: 12, fontFamily: "monospace" }}>{profile.userId.slice(0, 8)}…</span>
                  </div>
                )}
              </div>
              </div>
          )}
        </section>
      </div>
    </div>
  );
}
