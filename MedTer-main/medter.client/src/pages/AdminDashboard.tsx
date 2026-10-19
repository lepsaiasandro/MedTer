import { useEffect, useMemo, useState, type ReactNode } from "react";
import api from "../api";
import { usePrefs } from "../i18n";
import { Check, Trash, List, Users, Cap, Bell, Clock, Plus, Edit, Image } from "../components/icons";
import MediaPlaceholder from "../components/MediaPlaceholder";
import { partnerLogoUrl } from "../partnerLogos";
import { SearchField } from "../components/FilterBar";
import { matchesSearch } from "../lib/search";

interface Announcement {
  id: number;
  title: string;
  category?: string;
  format?: string;
  shortDescription?: string;
  description?: string;
  city?: string;
  points: number;
  imageUrl?: string;
  startDate?: string;
  registrationDeadline?: string;
  centerName: string;
  status: string;
  createdAt?: string;
  type?: string;
  duration?: string;
  language?: string;
  interestedCount?: number;
}

interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  role: string;
  city?: string;
  phone?: string;
  specialty?: string;
  isApproved: boolean;
  createdAt: string;
  verificationStatus?: string;
  profilePhotoUrl?: string | null;
  rejectionReason?: string | null;
}

interface ProfileChangeRequest {
  id: number;
  userId: string;
  email: string;
  displayName: string;
  role: string;
  currentFirstName?: string;
  currentLastName?: string;
  currentSpecialty?: string;
  currentCenterName?: string;
  currentDescription?: string;
  currentCity?: string;
  currentPhone?: string;
  proposedFirstName?: string;
  proposedLastName?: string;
  proposedSpecialty?: string;
  proposedCenterName?: string;
  proposedDescription?: string;
  proposedCity?: string;
  proposedPhone?: string;
  submittedAt: string;
}

interface AdBanner {
  id: number;
  brand: string;
  href: string;
  titleKa: string;
  titleEn: string;
  textKa: string;
  textEn: string;
  ctaKa: string;
  ctaEn: string;
  accent: string;
  accent2: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

type AdForm = {
  brand: string;
  href: string;
  titleKa: string;
  titleEn: string;
  textKa: string;
  textEn: string;
  ctaKa: string;
  ctaEn: string;
  accent: string;
  accent2: string;
  sortOrder: number;
  isActive: boolean;
};

const emptyAdForm = (): AdForm => ({
  brand: "",
  href: "https://",
  titleKa: "",
  titleEn: "",
  textKa: "",
  textEn: "",
  ctaKa: "ნახვა",
  ctaEn: "Learn more",
  accent: "#2563eb",
  accent2: "#1e40af",
  sortOrder: 0,
  isActive: true,
});

type Tab = "overview" | "member-requests" | "profile-changes" | "pending-posts" | "members" | "content" | "ads" | "notify" | "settings";

export default function AdminDashboard() {
  const { t, lang } = usePrefs();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [trainings, setTrainings] = useState<Announcement[]>([]);
  const [profileChanges, setProfileChanges] = useState<ProfileChangeRequest[]>([]);
  const [ads, setAds] = useState<AdBanner[]>([]);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectKind, setRejectKind] = useState<"post" | "profile">("post");
  const [reason, setReason] = useState("");
  const [userAction, setUserAction] = useState<{ type: "reject" | "suspend"; id: string } | null>(null);
  const [userReason, setUserReason] = useState("");
  const [tab, setTab] = useState<Tab>("overview");
  const [memberFilter, setMemberFilter] = useState("");
  const [contentFilter, setContentFilter] = useState<"all" | "Published" | "Pending" | "Rejected" | "Draft">("all");
  const [contentSearch, setContentSearch] = useState("");
  const [queueSearch, setQueueSearch] = useState("");

  const [notifyMode, setNotifyMode] = useState<"all" | "doctors" | "centers" | "one">("all");
  const [notifyUserId, setNotifyUserId] = useState("");
  const [notifyMessage, setNotifyMessage] = useState("");
  const [notifyBusy, setNotifyBusy] = useState(false);
  const [notifyResult, setNotifyResult] = useState("");
  const [notifyError, setNotifyError] = useState("");

  const [settings, setSettings] = useState({ userVerificationEnabled: true, announcementVerificationEnabled: true });
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [settingsFlash, setSettingsFlash] = useState("");

  const [adForm, setAdForm] = useState<AdForm>(emptyAdForm);
  const [editingAdId, setEditingAdId] = useState<number | null>(null);
  const [adBusy, setAdBusy] = useState(false);
  const [adFlash, setAdFlash] = useState("");
  const [adError, setAdError] = useState("");
  const [showAdForm, setShowAdForm] = useState(false);

  const fmtDateTime = (iso?: string) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (isNaN(d.getTime()) || d.getFullYear() < 2000) return "—";
    const months = lang === "en"
      ? ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
      : ["იან", "თებ", "მარ", "აპრ", "მაი", "ივნ", "ივლ", "აგვ", "სექ", "ოქტ", "ნოე", "დეკ"];
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}, ${hh}:${mm}`;
  };

  const fmtRelative = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime()) || d.getFullYear() < 2000) return "";
    const sec = Math.round((Date.now() - d.getTime()) / 1000);
    if (sec < 60) return t("ახლახანს", "Just now");
    const min = Math.floor(sec / 60);
    if (min < 60) return t(`${min} წუთის წინ`, `${min}m ago`);
    const hr = Math.floor(min / 60);
    if (hr < 24) return t(`${hr} საათის წინ`, `${hr}h ago`);
    const day = Math.floor(hr / 24);
    if (day < 7) return t(`${day} დღის წინ`, `${day}d ago`);
    return fmtDateTime(iso);
  };

  const statusLabel = (s: string) => {
    if (s === "Published") return t("გამოქვეყნებული", "Published");
    if (s === "Pending") return t("განხილვაში", "Needs review");
    if (s === "Rejected") return t("უარყოფილი", "Declined");
    if (s === "Draft") return t("დრაფტი", "Draft");
    return s;
  };

  const load = () => {
    api.get<AdminUser[]>("/admin/users").then((r) => setUsers(r.data)).catch(() => setUsers([]));
    api.get<Announcement[]>("/admin/announcements").then((r) => setTrainings(r.data)).catch(() => setTrainings([]));
    api.get<ProfileChangeRequest[]>("/admin/profile-changes").then((r) => setProfileChanges(r.data)).catch(() => setProfileChanges([]));
    api.get<AdBanner[]>("/admin/ads").then((r) => setAds(r.data)).catch(() => setAds([]));
    api.get<{ userVerificationEnabled: boolean; announcementVerificationEnabled: boolean }>("/admin/settings")
      .then((r) => setSettings(r.data))
      .catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const openNewAd = () => {
    setEditingAdId(null);
    setAdForm({ ...emptyAdForm(), sortOrder: ads.length });
    setAdError("");
    setAdFlash("");
    setShowAdForm(true);
  };

  const openEditAd = (a: AdBanner) => {
    setEditingAdId(a.id);
    setAdForm({
      brand: a.brand,
      href: a.href,
      titleKa: a.titleKa,
      titleEn: a.titleEn,
      textKa: a.textKa,
      textEn: a.textEn,
      ctaKa: a.ctaKa,
      ctaEn: a.ctaEn,
      accent: a.accent,
      accent2: a.accent2,
      sortOrder: a.sortOrder,
      isActive: a.isActive,
    });
    setAdError("");
    setAdFlash("");
    setShowAdForm(true);
  };

  const saveAd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdBusy(true);
    setAdError("");
    setAdFlash("");
    try {
      if (editingAdId == null) {
        await api.post("/admin/ads", adForm);
        setAdFlash(t("რეკლამა დაემატა", "Ad created"));
      } else {
        await api.put(`/admin/ads/${editingAdId}`, adForm);
        setAdFlash(t("რეკლამა განახლდა", "Ad updated"));
      }
      setShowAdForm(false);
      setEditingAdId(null);
      setAdForm(emptyAdForm());
      load();
    } catch (err: any) {
      setAdError(err?.response?.data?.message || t("შენახვა ვერ მოხერხდა", "Could not save"));
    } finally {
      setAdBusy(false);
    }
  };

  const toggleAdActive = async (a: AdBanner) => {
    try {
      await api.put(`/admin/ads/${a.id}`, { ...a, isActive: !a.isActive });
      load();
    } catch {
      setAdError(t("განახლება ვერ მოხერხდა", "Could not update"));
    }
  };

  const deleteAd = async (id: number) => {
    if (!confirm(t("წავშალოთ ეს რეკლამა?", "Delete this ad?"))) return;
    try {
      await api.delete(`/admin/ads/${id}`);
      load();
    } catch {
      setAdError(t("წაშლა ვერ მოხერხდა", "Could not delete"));
    }
  };

  const toggleSetting = async (key: "userVerificationEnabled" | "announcementVerificationEnabled", value: boolean) => {
    setSettingsBusy(true);
    setSettingsFlash("");
    try {
      const { data } = await api.put<{ userVerificationEnabled: boolean; announcementVerificationEnabled: boolean }>(
        "/admin/settings",
        { [key]: value }
      );
      setSettings(data);
      const label = key === "userVerificationEnabled"
        ? t("წევრობის ვერიფიკაცია", "Member verification")
        : t("ტრენინგების ვერიფიკაცია", "Training verification");
      setSettingsFlash(
        value
          ? t(`${label} — ჩართულია`, `${label} — on`)
          : t(`${label} — გამორთულია`, `${label} — off`)
      );
      load();
    } catch {
      setSettingsFlash(t("შენახვა ვერ მოხერხდა", "Could not save"));
    } finally {
      setSettingsBusy(false);
    }
  };

  const userStatus = (u: AdminUser) =>
    u.verificationStatus || (u.isApproved ? "Approved" : "Pending");

  const pendingUsers = useMemo(
    () => users.filter((u) => userStatus(u) === "Pending"),
    [users]
  );
  const pendingTrainings = useMemo(() => trainings.filter((a) => a.status === "Pending"), [trainings]);
  const approvedUsers = useMemo(
    () => users.filter((u) => userStatus(u) === "Approved"),
    [users]
  );
  const queueTotal = pendingUsers.length + pendingTrainings.length + profileChanges.length;

  const approve = async (id: number) => { await api.post(`/announcements/${id}/approve`); load(); };
  const approveUser = async (id: string) => { await api.post(`/admin/users/${id}/approve`); load(); };
  const approveProfileChange = async (id: number) => { await api.post(`/admin/profile-changes/${id}/approve`); load(); };
  const openUserAction = (type: "reject" | "suspend", id: string) => {
    setUserAction({ type, id });
    setUserReason("");
  };
  const doUserAction = async () => {
    if (!userAction) return;
    const path = userAction.type === "reject"
      ? `/admin/users/${userAction.id}/reject`
      : `/admin/users/${userAction.id}/suspend`;
    await api.post(path, {
      reason: userReason.trim() || t("მიზეზი მითითებული არ არის", "No reason provided"),
    });
    setUserAction(null);
    setUserReason("");
    load();
  };
  const deleteTraining = async (id: number) => {
    if (!confirm(t("ნამდვილად გსურს ამ ტრენინგის წაშლა?", "Delete this training?"))) return;
    await api.delete(`/admin/announcements/${id}`);
    load();
  };
  const doReject = async () => {
    if (rejectId === null) return;
    if (rejectKind === "profile") {
      await api.post(`/admin/profile-changes/${rejectId}/reject`, { reason: reason.trim() || t("მიზეზი მითითებული არ არის", "No reason provided") });
    } else {
      await api.post(`/announcements/${rejectId}/reject`, { reason: reason.trim() || t("მიზეზი მითითებული არ არის", "No reason provided") });
    }
    setRejectId(null);
    setReason("");
    load();
  };

  const verificationLabel = (s: string) => {
    if (s === "Approved") return t("დამტკიცებული", "Approved");
    if (s === "Rejected") return t("უარყოფილი", "Rejected");
    if (s === "Suspended") return t("შეჩერებული", "Suspended");
    return t("მოლოდინში", "Pending");
  };
  const verificationBadge = (s: string) =>
    s === "Approved" ? "ok" : s === "Rejected" ? "bad" : s === "Suspended" ? "muted" : "pending";

  const avatarEl = (u: AdminUser, cls = "admin-queue-avatar") => (
    <div className={cls}>
      {u.profilePhotoUrl
        ? <img src={u.profilePhotoUrl} alt="" />
        : u.displayName.charAt(0)}
    </div>
  );

  const sendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotifyError("");
    setNotifyResult("");
    const message = notifyMessage.trim();
    if (!message) {
      setNotifyError(t("შეტყობინების ტექსტი სავალდებულოა", "Message is required"));
      return;
    }
    if (notifyMode === "one" && !notifyUserId) {
      setNotifyError(t("აირჩიე მომხმარებელი", "Select a user"));
      return;
    }
    setNotifyBusy(true);
    try {
      const body =
        notifyMode === "one"
          ? { message, userId: notifyUserId }
          : { message, audience: notifyMode };
      const { data } = await api.post<{ sent: number }>("/admin/notifications", body);
      setNotifyResult(t(`გაგზავნილია ${data.sent} მომხმარებელთან`, `Sent to ${data.sent} user(s)`));
      setNotifyMessage("");
    } catch (err: any) {
      setNotifyError(err?.response?.data || t("გაგზავნა ვერ მოხერხდა", "Failed to send"));
    } finally {
      setNotifyBusy(false);
    }
  };

  const roleLabel = (role: string) =>
    role === "Doctor" ? t("ექიმი", "Doctor") : t("ტრენინგ ცენტრი", "Training Center");

  const changeLine = (before?: string | null, after?: string | null, label?: string) => {
    const b = (before ?? "").trim() || "—";
    const a = (after ?? "").trim() || "—";
    if (b === a) return null;
    return (
      <div key={label}>
        <span>{label}</span>
        <b style={{ display: "block" }}>
          <span style={{ color: "var(--soft)", textDecoration: "line-through", marginRight: 8 }}>{b}</span>
          <span style={{ color: "var(--teal)" }}>{a}</span>
        </b>
      </div>
    );
  };

  const matchesQuery = (q: string, values: Array<string | number | undefined | null>) =>
    matchesSearch(q, values);

  const filteredMembers = users.filter((u) =>
    matchesQuery(memberFilter, [u.displayName, u.email, u.city, u.specialty, u.phone, u.role, userStatus(u)])
  );

  const filteredPendingUsers = pendingUsers.filter((u) =>
    matchesQuery(queueSearch, [u.displayName, u.email, u.city, u.specialty, u.phone, u.role])
  );

  const filteredProfileChanges = profileChanges.filter((r) =>
    matchesQuery(queueSearch, [r.displayName, r.email, r.role, r.proposedSpecialty, r.proposedCenterName, r.proposedCity])
  );

  const filteredPendingTrainings = pendingTrainings.filter((a) =>
    matchesQuery(queueSearch, [a.title, a.centerName, a.category, a.type, a.city, a.format])
  );

  const filteredContent = trainings.filter((a) => {
    if (contentFilter !== "all" && a.status !== contentFilter) return false;
    return matchesQuery(contentSearch, [a.title, a.centerName, a.category, a.type, a.city, a.format, a.shortDescription]);
  });

  const nav: { id: Tab; label: string; count?: number; icon: ReactNode }[] = [
    { id: "overview", label: t("მიმოხილვა", "Overview"), icon: <List size={17} /> },
    { id: "member-requests", label: t("წევრობის მოთხოვნები", "Member requests"), count: pendingUsers.length, icon: <Users size={17} /> },
    { id: "profile-changes", label: t("პროფილის ცვლილებები", "Profile changes"), count: profileChanges.length, icon: <Users size={17} /> },
    { id: "pending-posts", label: t("პოსტების დამტკიცება", "Post approvals"), count: pendingTrainings.length, icon: <Cap size={17} /> },
    { id: "members", label: t("წევრები", "Members"), count: users.length, icon: <Users size={17} /> },
    { id: "content", label: t("კონტენტი", "Content"), count: trainings.length, icon: <List size={17} /> },
    { id: "ads", label: t("რეკლამები", "Ads"), count: ads.length, icon: <Image size={17} /> },
    { id: "notify", label: t("შეტყობინება", "Notify"), icon: <Bell size={17} /> },
    { id: "settings", label: t("ვერიფიკაცია", "Verification"), icon: <Check size={17} /> },
  ];

  const empty = (title: string, text: string, icon: ReactNode) => (
    <div className="empty admin-empty">
      <div className="ill">{icon}</div>
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
  );

  const memberRequestCard = (u: AdminUser) => (
    <article className="admin-queue-card" key={u.id}>
      {avatarEl(u)}
      <div className="admin-queue-main">
        <div className="admin-queue-top">
          <div>
            <div className="admin-queue-title">{u.displayName}</div>
            <div className="admin-queue-sub">
              {roleLabel(u.role)}
              {u.specialty ? ` · ${u.specialty}` : ""}
              {u.city ? ` · ${u.city}` : ""}
            </div>
          </div>
          <span className="admin-badge pending">{t("ითხოვს წევრობას", "Requested to join")}</span>
        </div>
        <div className="admin-meta-grid">
          <div><span>{t("ელფოსტა", "Email")}</span><b>{u.email}</b></div>
          {u.phone && <div><span>{t("ტელეფონი", "Phone")}</span><b>{u.phone}</b></div>}
          <div><span>{t("მოთხოვნის დრო", "Requested")}</span><b>{fmtDateTime(u.createdAt)}</b></div>
          <div><span>{t("როდის", "When")}</span><b>{fmtRelative(u.createdAt)}</b></div>
        </div>
        <div className="admin-queue-actions">
          <button className="btn btn-ghost btn-sm" style={{ color: "var(--danger)", borderColor: "#f3c9c9" }} onClick={() => openUserAction("reject", u.id)}>
            {t("უარყოფა", "Decline")}
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => approveUser(u.id)}>
            <Check size={15} /> {t("დამტკიცება", "Approve")}
          </button>
        </div>
      </div>
    </article>
  );

  const profileChangeCard = (r: ProfileChangeRequest) => {
    const isDoctor = r.role === "Doctor";
    const diffs = isDoctor
      ? [
          changeLine(
            [r.currentFirstName, r.currentLastName].filter(Boolean).join(" "),
            [r.proposedFirstName, r.proposedLastName].filter(Boolean).join(" "),
            t("სახელი", "Name")
          ),
          changeLine(r.currentSpecialty, r.proposedSpecialty, t("სპეციალობა", "Specialty")),
          changeLine(r.currentCity, r.proposedCity, t("ქალაქი", "City")),
          changeLine(r.currentPhone, r.proposedPhone, t("ტელეფონი", "Phone")),
        ]
      : [
          changeLine(r.currentCenterName, r.proposedCenterName, t("ცენტრი", "Center")),
          changeLine(r.currentDescription, r.proposedDescription, t("აღწერა", "Description")),
          changeLine(r.currentCity, r.proposedCity, t("ქალაქი", "City")),
          changeLine(r.currentPhone, r.proposedPhone, t("ტელეფონი", "Phone")),
        ];

    return (
      <article className="admin-queue-card" key={r.id}>
        <div className="admin-queue-avatar">{r.displayName.charAt(0)}</div>
        <div className="admin-queue-main">
          <div className="admin-queue-top">
            <div>
              <div className="admin-queue-title">{r.displayName}</div>
              <div className="admin-queue-sub">
                {roleLabel(r.role)} · {r.email}
              </div>
            </div>
            <span className="admin-badge pending">{t("პროფილის ცვლილება", "Profile edit")}</span>
          </div>
          <div className="admin-meta-grid">
            {diffs.filter(Boolean)}
            <div><span>{t("მოთხოვნის დრო", "Requested")}</span><b>{fmtDateTime(r.submittedAt)}</b></div>
            <div><span>{t("როდის", "When")}</span><b>{fmtRelative(r.submittedAt)}</b></div>
          </div>
          <div className="admin-queue-actions">
            <button
              className="btn btn-ghost btn-sm"
              style={{ color: "var(--danger)", borderColor: "#f3c9c9" }}
              onClick={() => { setRejectKind("profile"); setRejectId(r.id); setReason(""); }}
            >
              {t("უარყოფა", "Decline")}
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => approveProfileChange(r.id)}>
              <Check size={15} /> {t("დამტკიცება", "Approve")}
            </button>
          </div>
        </div>
      </article>
    );
  };

  const postApprovalCard = (a: Announcement, compact = false) => (
    <article className={`admin-queue-card admin-post-card ${compact ? "compact" : ""}`} key={a.id}>
      <div className="admin-post-thumb">
        {a.imageUrl
          ? <img src={a.imageUrl} alt="" />
          : <MediaPlaceholder title={a.title} subtitle={a.centerName} variant="navy" />}
      </div>
      <div className="admin-queue-main">
        <div className="admin-queue-top">
          <div>
            <div className="admin-queue-title">{a.title}</div>
            <div className="admin-queue-sub">
              {a.centerName}
              {a.category ? ` · ${a.category}` : ""}
              {a.type ? ` · ${a.type}` : ""}
            </div>
          </div>
          <span className={`admin-badge ${a.status === "Pending" ? "pending" : a.status === "Published" ? "ok" : a.status === "Rejected" ? "bad" : "muted"}`}>
            {statusLabel(a.status)}
          </span>
        </div>
        {a.shortDescription && <p className="admin-queue-desc">{a.shortDescription}</p>}
        <div className="admin-meta-grid">
          <div><span>{t("გამოქვეყნების მოთხოვნა", "Submitted")}</span><b>{fmtDateTime(a.createdAt)}</b></div>
          <div><span>{t("როდის", "When")}</span><b>{fmtRelative(a.createdAt) || "—"}</b></div>
          <div><span>{t("ტრენინგის თარიღი", "Event date")}</span><b>{fmtDateTime(a.startDate)}</b></div>
          <div><span>{t("რეგისტრაციის ვადა", "Reg. deadline")}</span><b>{fmtDateTime(a.registrationDeadline)}</b></div>
          <div><span>{t("ფორმატი", "Format")}</span><b>{a.format === "ონლაინ" ? t("ონლაინ", "Online") : a.city || t("დასწრებით", "In person")}</b></div>
          <div><span>{t("ქულა / ხანგრძლივობა", "Points / duration")}</span><b>{a.points} {t("ქულა", "pts")}{a.duration ? ` · ${a.duration}` : ""}</b></div>
        </div>
        <div className="admin-queue-actions">
          {a.status === "Pending" && (
            <>
              <button className="btn btn-ghost btn-sm" style={{ color: "var(--danger)", borderColor: "#f3c9c9" }} onClick={() => { setRejectKind("post"); setRejectId(a.id); setReason(""); }}>
                {t("უარყოფა", "Decline")}
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => approve(a.id)}>
                <Check size={15} /> {t("დამტკიცება", "Approve")}
              </button>
            </>
          )}
          <button className="btn btn-ghost btn-sm" style={{ color: "var(--danger)", borderColor: "#f3c9c9" }} onClick={() => deleteTraining(a.id)}>
            <Trash size={15} /> {t("წაშლა", "Delete")}
          </button>
        </div>
      </div>
    </article>
  );

  return (
    <div className="admin-shell">
      <div className="admin-hero">
        <div>
          <div className="admin-kicker">{t("ჯგუფის ადმინისტრირება", "Group admin tools")}</div>
          <h1>{t("MedTer ადმინ პანელი", "MedTer Admin Panel")}</h1>
        </div>
        {queueTotal > 0 && (
          <div className="admin-hero-alert">
            <Clock size={18} />
            <div>
              <b>{queueTotal}</b> {t("ელოდება განხილვას", "awaiting review")}
              <div className="hint-line">
                {pendingUsers.length} {t("წევრი", "members")} · {profileChanges.length} {t("პროფილი", "profiles")} · {pendingTrainings.length} {t("პოსტი", "posts")}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="admin-layout">
        <aside className="admin-side">
          <div className="admin-side-title">{t("ინსტრუმენტები", "Tools")}</div>
          {nav.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`admin-nav-item ${tab === item.id ? "active" : ""}`}
              onClick={() => {
                setTab(item.id);
                setQueueSearch("");
              }}
            >
              <span className="ic">{item.icon}</span>
              <span className="lbl">{item.label}</span>
              {item.id === "settings" && (
                <span className={`cnt ${(settings.userVerificationEnabled || settings.announcementVerificationEnabled) ? "hot" : ""}`}>
                  {[settings.userVerificationEnabled, settings.announcementVerificationEnabled].filter(Boolean).length}/2
                </span>
              )}
              {typeof item.count === "number" && item.count > 0 && (
                <span className={`cnt ${item.id.includes("pending") || item.id.includes("request") || item.id.includes("profile") ? "hot" : ""}`}>{item.count}</span>
              )}
            </button>
          ))}
        </aside>

        <section className="admin-main">
          {tab === "overview" && (
            <>
              <div className="admin-section-head">
                <h2>{t("მიმოხილვა", "Overview")}</h2>
                <p>{t("რა საჭიროებს ყურადღებას ახლა", "What needs your attention right now")}</p>
              </div>
              <div className="admin-kpi">
                <button type="button" className="admin-kpi-card" onClick={() => setTab("member-requests")}>
                  <span className="k">{t("წევრობის მოთხოვნები", "Member requests")}</span>
                  <span className="v">{pendingUsers.length}</span>
                  <span className="s">{t("დამტკიცება ან უარყოფა", "Approve or decline")}</span>
                </button>
                <button type="button" className="admin-kpi-card" onClick={() => setTab("profile-changes")}>
                  <span className="k">{t("პროფილის ცვლილებები", "Profile changes")}</span>
                  <span className="v">{profileChanges.length}</span>
                  <span className="s">{t("ინფორმაციის განახლება", "Info updates")}</span>
                </button>
                <button type="button" className="admin-kpi-card" onClick={() => setTab("pending-posts")}>
                  <span className="k">{t("პოსტები განხილვაში", "Posts in review")}</span>
                  <span className="v">{pendingTrainings.length}</span>
                  <span className="s">{t("ტრენინგების დამტკიცება", "Approve trainings")}</span>
                </button>
                <button type="button" className="admin-kpi-card" onClick={() => setTab("ads")}>
                  <span className="k">{t("რეკლამები", "Ads")}</span>
                  <span className="v">{ads.length}</span>
                  <span className="s">{t("ბანერების მართვა", "Manage banners")} · {ads.filter((a) => a.isActive).length} {t("აქტიური", "active")}</span>
                </button>
                <button type="button" className="admin-kpi-card" onClick={() => setTab("members")}>
                  <span className="k">{t("სულ წევრები", "Total members")}</span>
                  <span className="v">{users.length}</span>
                  <span className="s">{approvedUsers.length} {t("აქტიური", "active")}</span>
                </button>
              </div>

              <div className="admin-section-head" style={{ marginTop: 8 }}>
                <h2>{t("სწრაფი რიგი", "Quick queue")}</h2>
                <p>{t("უახლესი მოთხოვნები თარიღითა და დროით", "Latest requests with date and time")}</p>
              </div>
              {queueTotal === 0
                ? empty(t("ყველაფერი განხილულია", "All clear"), t("ამჟამად დასამტკიცებელი არაფერია.", "Nothing waiting for approval right now."), <Check size={42} />)
                : (
                  <div className="admin-queue">
                    {pendingUsers.slice(0, 2).map(memberRequestCard)}
                    {profileChanges.slice(0, 2).map(profileChangeCard)}
                    {pendingTrainings.slice(0, 2).map((a) => postApprovalCard(a))}
                  </div>
                )}
            </>
          )}

          {tab === "member-requests" && (
            <>
              <div className="admin-section-head row">
                <div>
                  <h2>{t("წევრობის მოთხოვნები", "Member requests")}</h2>
                  <p>{t("ადამიანები, რომლებიც ითხოვენ MedTer-ზე გაწევრიანებას", "People who asked to join MedTer")}</p>
                </div>
                <SearchField
                  size="compact"
                  value={queueSearch}
                  onChange={setQueueSearch}
                  placeholder={t("ძიება სახელით, ელფოსტით…", "Search by name, email…")}
                  aria-label={t("მოთხოვნების ძებნა", "Search requests")}
                />
              </div>
              {pendingUsers.length === 0
                ? empty(t("მოთხოვნები არ არის", "No requests"), t("ახალი რეგისტრაციები აქ გამოჩნდება.", "New registrations will appear here."), <Users size={42} />)
                : filteredPendingUsers.length === 0
                  ? empty(t("შედეგი არ მოიძებნა", "No matches"), t("შეცვალე ძიების ტექსტი.", "Try a different search."), <Users size={42} />)
                  : (
                    <div className="admin-queue">{filteredPendingUsers.map(memberRequestCard)}</div>
                  )}
            </>
          )}

          {tab === "profile-changes" && (
            <>
              <div className="admin-section-head row">
                <div>
                  <h2>{t("პროფილის ცვლილებები", "Profile changes")}</h2>
                  <p>{t("მომხმარებლების მიერ მოთხოვნილი ინფორმაციის განახლებები", "User-requested profile information updates")}</p>
                </div>
                <SearchField
                  size="compact"
                  value={queueSearch}
                  onChange={setQueueSearch}
                  placeholder={t("ძიება სახელით, ელფოსტით…", "Search by name, email…")}
                  aria-label={t("ცვლილებების ძებნა", "Search changes")}
                />
              </div>
              {profileChanges.length === 0
                ? empty(t("ცვლილებები არ არის", "No changes"), t("პროფილის განახლებები აქ გამოჩნდება.", "Profile updates will appear here."), <Users size={42} />)
                : filteredProfileChanges.length === 0
                  ? empty(t("შედეგი არ მოიძებნა", "No matches"), t("შეცვალე ძიების ტექსტი.", "Try a different search."), <Users size={42} />)
                  : (
                    <div className="admin-queue">{filteredProfileChanges.map(profileChangeCard)}</div>
                  )}
            </>
          )}

          {tab === "pending-posts" && (
            <>
              <div className="admin-section-head row">
                <div>
                  <h2>{t("პოსტების დამტკიცება", "Post approvals")}</h2>
                  <p>{t("ტრენინგ ცენტრების განცხადებები, რომლებიც ელოდება გამოქვეყნებას", "Training center posts waiting to go live")}</p>
                </div>
                <SearchField
                  size="compact"
                  value={queueSearch}
                  onChange={setQueueSearch}
                  placeholder={t("ძიება სათაურით, ცენტრით…", "Search by title, center…")}
                  aria-label={t("პოსტების ძებნა", "Search posts")}
                />
              </div>
              {pendingTrainings.length === 0
                ? empty(t("ყველაფერი განხილულია", "All reviewed"), t("დასამტკიცებელი ტრენინგი არ არის.", "No trainings waiting for approval."), <Check size={42} />)
                : filteredPendingTrainings.length === 0
                  ? empty(t("შედეგი არ მოიძებნა", "No matches"), t("შეცვალე ძიების ტექსტი.", "Try a different search."), <Cap size={42} />)
                  : (
                    <div className="admin-queue">{filteredPendingTrainings.map((a) => postApprovalCard(a))}</div>
                  )}
            </>
          )}

          {tab === "members" && (
            <>
              <div className="admin-section-head row">
                <div>
                  <h2>{t("წევრები", "Members")}</h2>
                  <p>{t("ყველა ექიმი და ტრენინგ ცენტრი", "All doctors and training centers")}</p>
                </div>
                <SearchField
                  size="compact"
                  value={memberFilter}
                  onChange={setMemberFilter}
                  placeholder={t("ძიება სახელით, ელფოსტით…", "Search by name, email…")}
                  aria-label={t("წევრების ძებნა", "Search members")}
                />
              </div>
              {filteredMembers.length === 0
                ? empty(t("წევრები არ მოიძებნა", "No members found"), t("შეცვალე ძიება ან დაამტკიცე ახალი მომხმარებლები.", "Try another search or approve new users."), <Users size={42} />)
                : (
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>{t("წევრი", "Member")}</th>
                          <th>{t("როლი", "Role")}</th>
                          <th>{t("სტატუსი", "Status")}</th>
                          <th>{t("რეგისტრაცია", "Joined")}</th>
                          <th>{t("დრო", "Time")}</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMembers.map((u) => {
                          const st = userStatus(u);
                          return (
                          <tr key={u.id}>
                            <td>
                              <div className="admin-person">
                                {avatarEl(u, "av")}
                                <span>
                                  <b>{u.displayName}</b>
                                  <small>{u.email}{u.city ? ` · ${u.city}` : ""}{u.phone ? ` · ${u.phone}` : ""}</small>
                                </span>
                              </div>
                            </td>
                            <td>{roleLabel(u.role)}{u.specialty ? ` · ${u.specialty}` : ""}</td>
                            <td>
                              <span className={`admin-badge ${verificationBadge(st)}`}>
                                {verificationLabel(st)}
                              </span>
                            </td>
                            <td>{fmtDateTime(u.createdAt)}</td>
                            <td>{fmtRelative(u.createdAt)}</td>
                            <td className="admin-td-actions">
                              {st === "Pending" && (
                                <>
                                  <button className="btn btn-primary btn-sm" onClick={() => approveUser(u.id)}>
                                    <Check size={14} /> {t("დამტკიცება", "Approve")}
                                  </button>
                                  <button className="btn btn-ghost btn-sm" style={{ color: "var(--danger)" }} onClick={() => openUserAction("reject", u.id)}>
                                    {t("უარყოფა", "Decline")}
                                  </button>
                                </>
                              )}
                              {(st === "Rejected" || st === "Suspended") && (
                                <button className="btn btn-primary btn-sm" onClick={() => approveUser(u.id)}>
                                  <Check size={14} /> {t("გააქტიურება", "Reactivate")}
                                </button>
                              )}
                              {st === "Approved" && (
                                <button className="btn btn-ghost btn-sm" style={{ color: "var(--warning)" }} onClick={() => openUserAction("suspend", u.id)}>
                                  {t("შეჩერება", "Suspend")}
                                </button>
                              )}
                            </td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
            </>
          )}

          {tab === "content" && (
            <>
              <div className="admin-section-head row">
                <div>
                  <h2>{t("კონტენტი", "Content")}</h2>
                  <p>{t("ყველა ტრენინგი — სტატუსი, თარიღი და დრო", "All trainings — status, date and time")}</p>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", justifyContent: "flex-end" }}>
                  <SearchField
                    size="compact"
                    value={contentSearch}
                    onChange={setContentSearch}
                    placeholder={t("ძიება სათაურით, ცენტრით…", "Search by title, center…")}
                    aria-label={t("კონტენტის ძებნა", "Search content")}
                  />
                  <div className="role-toggle admin-filter-toggle">
                    {(["all", "Pending", "Published", "Rejected", "Draft"] as const).map((f) => (
                      <button key={f} type="button" className={contentFilter === f ? "active" : ""} onClick={() => setContentFilter(f)}>
                        {f === "all" ? t("ყველა", "All") : statusLabel(f)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {trainings.length === 0
                ? empty(t("კონტენტი არ არის", "No content"), t("ტრენინგები აქ გამოჩნდება.", "Trainings will appear here."), <Cap size={42} />)
                : filteredContent.length === 0
                  ? empty(t("შედეგი არ მოიძებნა", "No matches"), t("შეცვალე ძიება ან ფილტრი.", "Try another search or filter."), <Cap size={42} />)
                  : (
                    <div className="admin-queue">{filteredContent.map((a) => postApprovalCard(a))}</div>
                  )}
            </>
          )}

          {tab === "ads" && (
            <>
              <div className="admin-section-head" style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start", justifyContent: "space-between" }}>
                <div>
                  <h2>{t("რეკლამების მართვა", "Ad management")}</h2>
                  <p>{t("ბანერები ჰედერის ქვემოთ — PSP, Aversi და სხვა პარტნიორები", "Banners under the header — PSP, Aversi and other partners")}</p>
                </div>
                <button type="button" className="btn btn-primary btn-sm" onClick={openNewAd}>
                  <Plus size={15} /> {t("ახალი რეკლამა", "New ad")}
                </button>
              </div>

              {adFlash && <div className="admin-success" style={{ marginBottom: 12 }}>{adFlash}</div>}
              {adError && <div className="auth-error" style={{ marginBottom: 12 }}>{adError}</div>}

              {showAdForm && (
                <form className="card" style={{ padding: 18, marginBottom: 16 }} onSubmit={saveAd}>
                  <div className="admin-section-head" style={{ marginBottom: 12 }}>
                    <h2 style={{ fontSize: 17 }}>
                      {editingAdId == null ? t("ახალი ბანერი", "New banner") : t("ბანერის რედაქტირება", "Edit banner")}
                    </h2>
                  </div>
                  <div className="field-grid">
                    <div className="field">
                      <label>{t("ბრენდი", "Brand")} <span className="req">*</span></label>
                      <input className="control" value={adForm.brand} onChange={(e) => setAdForm({ ...adForm, brand: e.target.value })} placeholder="PSP" required />
                    </div>
                    <div className="field">
                      <label>{t("ბმული", "Link")} <span className="req">*</span></label>
                      <input className="control" value={adForm.href} onChange={(e) => setAdForm({ ...adForm, href: e.target.value })} placeholder="https://psp.ge/" required />
                    </div>
                    <div className="field">
                      <label>{t("სათაური (ქართ)", "Title (KA)")}</label>
                      <input className="control" value={adForm.titleKa} onChange={(e) => setAdForm({ ...adForm, titleKa: e.target.value })} />
                    </div>
                    <div className="field">
                      <label>{t("სათაური (ინგლ)", "Title (EN)")}</label>
                      <input className="control" value={adForm.titleEn} onChange={(e) => setAdForm({ ...adForm, titleEn: e.target.value })} />
                    </div>
                    <div className="field">
                      <label>{t("ტექსტი (ქართ)", "Text (KA)")}</label>
                      <input className="control" value={adForm.textKa} onChange={(e) => setAdForm({ ...adForm, textKa: e.target.value })} />
                    </div>
                    <div className="field">
                      <label>{t("ტექსტი (ინგლ)", "Text (EN)")}</label>
                      <input className="control" value={adForm.textEn} onChange={(e) => setAdForm({ ...adForm, textEn: e.target.value })} />
                    </div>
                    <div className="field">
                      <label>{t("ღილაკი (ქართ)", "CTA (KA)")}</label>
                      <input className="control" value={adForm.ctaKa} onChange={(e) => setAdForm({ ...adForm, ctaKa: e.target.value })} />
                    </div>
                    <div className="field">
                      <label>{t("ღილაკი (ინგლ)", "CTA (EN)")}</label>
                      <input className="control" value={adForm.ctaEn} onChange={(e) => setAdForm({ ...adForm, ctaEn: e.target.value })} />
                    </div>
                    <div className="field">
                      <label>{t("ფერი 1", "Color 1")}</label>
                      <input className="control" type="color" value={adForm.accent} onChange={(e) => setAdForm({ ...adForm, accent: e.target.value })} />
                    </div>
                    <div className="field">
                      <label>{t("ფერი 2", "Color 2")}</label>
                      <input className="control" type="color" value={adForm.accent2} onChange={(e) => setAdForm({ ...adForm, accent2: e.target.value })} />
                    </div>
                    <div className="field">
                      <label>{t("რიგი", "Order")}</label>
                      <input className="control" type="number" value={adForm.sortOrder} onChange={(e) => setAdForm({ ...adForm, sortOrder: Number(e.target.value) || 0 })} />
                    </div>
                    <div className="field">
                      <label>{t("სტატუსი", "Status")}</label>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, cursor: "pointer", fontWeight: 600 }}>
                        <input
                          type="checkbox"
                          checked={adForm.isActive}
                          onChange={(e) => setAdForm({ ...adForm, isActive: e.target.checked })}
                        />
                        {adForm.isActive ? t("აქტიური", "Active") : t("გამორთული", "Off")}
                      </label>
                    </div>
                  </div>
                  <div
                    className="partner-strip-card"
                    style={{
                      marginTop: 14,
                      background: `linear-gradient(105deg, ${adForm.accent} 0%, ${adForm.accent2} 100%)`,
                      minHeight: 88,
                      pointerEvents: "none",
                    }}
                  >
                    {(() => {
                      const previewLogo = partnerLogoUrl(adForm.brand);
                      return (
                        <div className={`partner-strip-mark${previewLogo ? " has-logo" : ""}`}>
                          {previewLogo ? (
                            <img src={previewLogo} alt="" className="partner-strip-logo" />
                          ) : (
                            adForm.brand || "Brand"
                          )}
                        </div>
                      );
                    })()}
                    <div className="partner-strip-copy">
                      <strong>{adForm.titleKa || adForm.titleEn || t("სათაური", "Title")}</strong>
                      <span>{adForm.textKa || adForm.textEn || t("ტექსტი", "Text")}</span>
                    </div>
                    <span className="partner-strip-cta">{adForm.ctaKa || adForm.ctaEn || "CTA"}</span>
                  </div>
                  <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
                    <button className="btn btn-primary" type="submit" disabled={adBusy}>
                      {adBusy ? "..." : editingAdId == null ? t("დამატება", "Add") : t("შენახვა", "Save")}
                    </button>
                    <button
                      className="btn btn-text"
                      type="button"
                      onClick={() => { setShowAdForm(false); setEditingAdId(null); setAdError(""); }}
                    >
                      {t("გაუქმება", "Cancel")}
                    </button>
                  </div>
                </form>
              )}

              {ads.length === 0
                ? empty(
                    t("რეკლამები არ არის", "No ads yet"),
                    t("დაამატე პირველი ბანერი — გამოჩნდება ყველა გვერდზე.", "Add the first banner — it will show on every page."),
                    <Image size={42} />
                  )
                : (
                  <div className="admin-queue">
                    {ads.map((a) => {
                      const logo = partnerLogoUrl(a.brand);
                      return (
                      <article className="admin-queue-card" key={a.id}>
                        <div
                          className={`partner-strip-mark${logo ? " has-logo" : ""}`}
                          style={{
                            width: 72,
                            minHeight: 64,
                            borderRadius: 12,
                            background: logo
                              ? "#fff"
                              : `linear-gradient(135deg, ${a.accent}, ${a.accent2})`,
                            flex: "none",
                            padding: logo ? 6 : undefined,
                          }}
                          aria-hidden
                        >
                          {logo ? (
                            <img src={logo} alt="" className="partner-strip-logo" style={{ maxWidth: 56, maxHeight: 48 }} />
                          ) : (
                            a.brand
                          )}
                        </div>
                        <div className="admin-queue-main">
                          <div className="admin-queue-top">
                            <div>
                              <div className="admin-queue-title">{a.brand} — {a.titleKa || a.titleEn}</div>
                              <div className="admin-queue-sub">{a.href}</div>
                            </div>
                            <span className={`admin-badge ${a.isActive ? "ok" : "muted"}`}>
                              {a.isActive ? t("აქტიური", "Active") : t("გამორთული", "Off")}
                            </span>
                          </div>
                          <div className="admin-meta-grid">
                            <div><span>{t("რიგი", "Order")}</span><b>{a.sortOrder}</b></div>
                            <div><span>{t("ტექსტი", "Text")}</span><b>{a.textKa || a.textEn || "—"}</b></div>
                          </div>
                          <div className="admin-queue-actions">
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEditAd(a)}>
                              <Edit size={14} /> {t("რედაქტირება", "Edit")}
                            </button>
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => void toggleAdActive(a)}>
                              {a.isActive ? t("გამორთვა", "Disable") : t("ჩართვა", "Enable")}
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              style={{ color: "var(--danger)", borderColor: "#f3c9c9" }}
                              onClick={() => void deleteAd(a.id)}
                            >
                              <Trash size={14} /> {t("წაშლა", "Delete")}
                            </button>
                          </div>
                        </div>
                      </article>
                      );
                    })}
                  </div>
                )}
            </>
          )}

          {tab === "notify" && (
            <div className="admin-notify card">
              <div className="admin-section-head" style={{ marginBottom: 14 }}>
                <h2>{t("შეტყობინების გაგზავნა", "Send notification")}</h2>
                <p>{t("გაუგზავნე ყველას, ჯგუფს ან კონკრეტულ წევრს — გამოჩნდება ზარის ხატულაზე.", "Send to everyone, a group, or one member — shows in their bell menu.")}</p>
              </div>
              <form onSubmit={sendNotification}>
                <div className="field">
                  <label>{t("მიმღებები", "Recipients")}</label>
                  <div className="role-toggle" style={{ maxWidth: "100%", marginBottom: 12 }}>
                    {([
                      ["all", t("ყველა", "All")],
                      ["doctors", t("ექიმები", "Doctors")],
                      ["centers", t("ცენტრები", "Centers")],
                      ["one", t("კონკრეტული", "Specific")],
                    ] as const).map(([mode, label]) => (
                      <button
                        key={mode}
                        type="button"
                        className={notifyMode === mode ? "active" : ""}
                        onClick={() => { setNotifyMode(mode); setNotifyResult(""); setNotifyError(""); }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                {notifyMode === "one" && (
                  <div className="field">
                    <label>{t("მომხმარებელი", "User")}</label>
                    <select className="control" value={notifyUserId} onChange={(e) => setNotifyUserId(e.target.value)} required>
                      <option value="">{t("აირჩიე…", "Select…")}</option>
                      {approvedUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.displayName} ({u.email}) — {roleLabel(u.role)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="field">
                  <label>{t("ტექსტი", "Message")} <span className="req">*</span></label>
                  <textarea
                    className="control"
                    rows={5}
                    value={notifyMessage}
                    onChange={(e) => setNotifyMessage(e.target.value)}
                    placeholder={t("მაგ: პლატფორმა ხვალ დროებით გაჩერდება…", "e.g. The platform will be briefly offline tomorrow…")}
                    maxLength={1000}
                    required
                  />
                  <div className="hint">{notifyMessage.length}/1000</div>
                </div>
                {notifyError && <div className="auth-error" style={{ marginBottom: 12 }}>{String(notifyError)}</div>}
                {notifyResult && <div className="admin-success">{notifyResult}</div>}
                <button className="btn btn-primary" disabled={notifyBusy} type="submit">
                  <Bell size={15} /> {notifyBusy ? "..." : t("გაგზავნა", "Send")}
                </button>
              </form>
            </div>
          )}

          {tab === "settings" && (
            <>
              <div className="admin-section-head">
                <h2>{t("ვერიფიკაციის სისტემა", "Verification system")}</h2>
                <p>{t("ჩართე ან გამორთე რეგისტრაციისა და ტრენინგების დამტკიცება", "Turn registration and training approval on or off")}</p>
              </div>

              <div className="admin-kpi" style={{ marginBottom: 16 }}>
                <div className="admin-kpi-card" style={{ cursor: "default" }}>
                  <span className="k">{t("წევრობის ვერიფიკაცია", "Member verification")}</span>
                  <span className="v" style={{ fontSize: 22 }}>
                    <span className={`admin-badge ${settings.userVerificationEnabled ? "ok" : "muted"}`}>
                      {settings.userVerificationEnabled ? t("ჩართულია", "On") : t("გამორთულია", "Off")}
                    </span>
                  </span>
                  <span className="s">
                    {settings.userVerificationEnabled
                      ? t("ახალი რეგისტრაციები ელოდება ადმინს", "New sign-ups wait for admin")
                      : t("რეგისტრაცია ავტომატურად აქტიურდება", "Sign-ups activate automatically")}
                  </span>
                </div>
                <div className="admin-kpi-card" style={{ cursor: "default" }}>
                  <span className="k">{t("ტრენინგების ვერიფიკაცია", "Training verification")}</span>
                  <span className="v" style={{ fontSize: 22 }}>
                    <span className={`admin-badge ${settings.announcementVerificationEnabled ? "ok" : "muted"}`}>
                      {settings.announcementVerificationEnabled ? t("ჩართულია", "On") : t("გამორთულია", "Off")}
                    </span>
                  </span>
                  <span className="s">
                    {settings.announcementVerificationEnabled
                      ? t("ტრენინგები ელოდება ადმინს", "Trainings wait for admin")
                      : t("ტრენინგები მაშინვე ქვეყნდება", "Trainings publish immediately")}
                  </span>
                </div>
              </div>

              <div className="admin-queue" style={{ gap: 14 }}>
                <article className="admin-queue-card">
                  <div className="admin-queue-main" style={{ width: "100%" }}>
                    <div className="admin-queue-top">
                      <div>
                        <div className="admin-queue-title">{t("წევრობის ვერიფიკაცია", "Member verification")}</div>
                        <div className="admin-queue-sub">
                          {t(
                            "როცა ჩართულია, ახალი ექიმები და ტრენინგ ცენტრები ადმინის დამტკიცებას ელოდებიან. გამორთვისას რეგისტრაცია მაშინვე აქტიურდება.",
                            "When on, new doctors and training centers wait for admin approval. When off, registration is active immediately."
                          )}
                        </div>
                      </div>
                      <span className={`admin-badge ${settings.userVerificationEnabled ? "ok" : "muted"}`}>
                        {settings.userVerificationEnabled
                          ? t("ამჟამად ჩართულია", "Currently on")
                          : t("ამჟამად გამორთულია", "Currently off")}
                      </span>
                    </div>
                    <div className="admin-queue-actions">
                      <button
                        className="btn btn-primary btn-sm"
                        disabled={settingsBusy || settings.userVerificationEnabled}
                        onClick={() => void toggleSetting("userVerificationEnabled", true)}
                      >
                        {t("ჩართვა", "Enable")}
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ color: "var(--danger)", borderColor: "#f3c9c9" }}
                        disabled={settingsBusy || !settings.userVerificationEnabled}
                        onClick={() => {
                          if (!confirm(t(
                            "გამორთვა დაამტკიცებს ყველა მოლოდინში მყოფ მომხმარებელს. გაგრძელება?",
                            "Disabling will approve all pending users. Continue?"
                          ))) return;
                          void toggleSetting("userVerificationEnabled", false);
                        }}
                      >
                        {t("გამორთვა", "Disable")}
                      </button>
                    </div>
                  </div>
                </article>

                <article className="admin-queue-card">
                  <div className="admin-queue-main" style={{ width: "100%" }}>
                    <div className="admin-queue-top">
                      <div>
                        <div className="admin-queue-title">{t("ტრენინგების ვერიფიკაცია", "Training verification")}</div>
                        <div className="admin-queue-sub">
                          {t(
                            "როცა ჩართულია, ტრენინგ ცენტრების განცხადებები ადმინის დამტკიცებას/უარყოფას ელოდება. გამორთვისას ტრენინგები მაშინვე ქვეყნდება.",
                            "When on, training center posts wait for admin approve/reject. When off, trainings publish immediately."
                          )}
                        </div>
                      </div>
                      <span className={`admin-badge ${settings.announcementVerificationEnabled ? "ok" : "muted"}`}>
                        {settings.announcementVerificationEnabled
                          ? t("ამჟამად ჩართულია", "Currently on")
                          : t("ამჟამად გამორთულია", "Currently off")}
                      </span>
                    </div>
                    <div className="admin-queue-actions">
                      <button
                        className="btn btn-primary btn-sm"
                        disabled={settingsBusy || settings.announcementVerificationEnabled}
                        onClick={() => void toggleSetting("announcementVerificationEnabled", true)}
                      >
                        {t("ჩართვა", "Enable")}
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ color: "var(--danger)", borderColor: "#f3c9c9" }}
                        disabled={settingsBusy || !settings.announcementVerificationEnabled}
                        onClick={() => {
                          if (!confirm(t(
                            "გამორთვა გამოაქვეყნებს ყველა განხილვაში მყოფ ტრენინგს. გაგრძელება?",
                            "Disabling will publish all pending trainings. Continue?"
                          ))) return;
                          void toggleSetting("announcementVerificationEnabled", false);
                        }}
                      >
                        {t("გამორთვა", "Disable")}
                      </button>
                    </div>
                  </div>
                </article>
              </div>
              {settingsFlash && <div className="admin-success" style={{ marginTop: 12 }}>{settingsFlash}</div>}
            </>
          )}
        </section>
      </div>

      {rejectId !== null && (
        <div className="modal" onClick={() => setRejectId(null)}>
          <div className="box" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div className="mhead">
              <div>
                <h3>{rejectKind === "profile" ? t("პროფილის უარყოფა", "Decline profile change") : t("პოსტის უარყოფა", "Decline post")}</h3>
                <p>{t("მიუთითე მიზეზი — მომხმარებელი მიიღებს შეტყობინებას", "Provide a reason — the user will be notified")}</p>
              </div>
              <button className="xbtn" onClick={() => setRejectId(null)}>×</button>
            </div>
            <div className="field">
              <label>{t("უარყოფის მიზეზი", "Decline reason")}</label>
              <textarea className="control" value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("მაგ: მონაცემები არასწორია…", "e.g. information is incorrect…")} />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
              <button className="btn btn-text" onClick={() => setRejectId(null)}>{t("გაუქმება", "Cancel")}</button>
              <button className="btn btn-primary" style={{ background: "var(--danger)" }} onClick={doReject}>{t("უარყოფა", "Decline")}</button>
            </div>
          </div>
        </div>
      )}

      {userAction && (
        <div className="modal" onClick={() => setUserAction(null)}>
          <div className="box" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div className="mhead">
              <div>
                <h3>
                  {userAction.type === "reject"
                    ? t("რეგისტრაციის უარყოფა", "Decline registration")
                    : t("ანგარიშის შეჩერება", "Suspend account")}
                </h3>
                <p>
                  {userAction.type === "reject"
                    ? t("მომხმარებელი დაინახავს უარის ფანჯარას და შეძლებს მეილით გასაჩივრებას", "The user will see a rejection popup and can appeal by email")
                    : t("მომხმარებელი ვეღარ შეძლებს შესვლას — შეძლებს მეილით გასაჩივრებას", "The user cannot sign in — they can appeal by email")}
                </p>
              </div>
              <button className="xbtn" onClick={() => setUserAction(null)}>×</button>
            </div>
            <div className="field">
              <label>{t("მიზეზი", "Reason")}</label>
              <textarea
                className="control"
                value={userReason}
                onChange={(e) => setUserReason(e.target.value)}
                placeholder={t("მაგ: არასრული ინფორმაცია…", "e.g. incomplete information…")}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
              <button className="btn btn-text" onClick={() => setUserAction(null)}>{t("გაუქმება", "Cancel")}</button>
              <button
                className="btn btn-primary"
                style={{ background: userAction.type === "reject" ? "var(--danger)" : "var(--warning)" }}
                onClick={() => void doUserAction()}
              >
                {userAction.type === "reject" ? t("უარყოფა", "Decline") : t("შეჩერება", "Suspend")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
