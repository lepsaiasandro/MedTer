import { useEffect, useMemo, useState, type ReactNode } from "react";
import api from "../api";
import { usePrefs } from "../i18n";
import { Check, Trash, List, Users, Cap, Bell, Clock } from "../components/icons";
import MediaPlaceholder from "../components/MediaPlaceholder";

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

type Tab = "overview" | "member-requests" | "profile-changes" | "pending-posts" | "members" | "content" | "notify" | "settings";

export default function AdminDashboard() {
  const { t, lang } = usePrefs();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [trainings, setTrainings] = useState<Announcement[]>([]);
  const [profileChanges, setProfileChanges] = useState<ProfileChangeRequest[]>([]);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectKind, setRejectKind] = useState<"post" | "profile">("post");
  const [reason, setReason] = useState("");
  const [userAction, setUserAction] = useState<{ type: "reject" | "suspend"; id: string } | null>(null);
  const [userReason, setUserReason] = useState("");
  const [tab, setTab] = useState<Tab>("overview");
  const [memberFilter, setMemberFilter] = useState("");
  const [contentFilter, setContentFilter] = useState<"all" | "Published" | "Pending" | "Rejected" | "Draft">("all");

  const [notifyMode, setNotifyMode] = useState<"all" | "doctors" | "centers" | "one">("all");
  const [notifyUserId, setNotifyUserId] = useState("");
  const [notifyMessage, setNotifyMessage] = useState("");
  const [notifyBusy, setNotifyBusy] = useState(false);
  const [notifyResult, setNotifyResult] = useState("");
  const [notifyError, setNotifyError] = useState("");

  const [settings, setSettings] = useState({ userVerificationEnabled: true, announcementVerificationEnabled: true });
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [settingsFlash, setSettingsFlash] = useState("");

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
    api.get<{ userVerificationEnabled: boolean; announcementVerificationEnabled: boolean }>("/admin/settings")
      .then((r) => setSettings(r.data))
      .catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const toggleSetting = async (key: "userVerificationEnabled" | "announcementVerificationEnabled", value: boolean) => {
    setSettingsBusy(true);
    setSettingsFlash("");
    try {
      const { data } = await api.put<{ userVerificationEnabled: boolean; announcementVerificationEnabled: boolean }>(
        "/admin/settings",
        { [key]: value }
      );
      setSettings(data);
      setSettingsFlash(
        value
          ? t("ვერიფიკაცია ჩართულია", "Verification enabled")
          : t("ვერიფიკაცია გამორთულია", "Verification disabled")
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
  const deleteUser = async (id: string) => {
    if (!confirm(t("ნამდვილად გსურს ამ მომხმარებლის წაშლა?", "Delete this user?"))) return;
    await api.delete(`/admin/users/${id}`);
    load();
  };
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

  const filteredMembers = users.filter((u) => {
    const q = memberFilter.trim().toLowerCase();
    if (!q) return true;
    return [u.displayName, u.email, u.city, u.specialty, u.phone, u.role]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));
  });

  const filteredContent = trainings.filter((a) => contentFilter === "all" || a.status === contentFilter);

  const nav: { id: Tab; label: string; count?: number; icon: ReactNode }[] = [
    { id: "overview", label: t("მიმოხილვა", "Overview"), icon: <List size={17} /> },
    { id: "member-requests", label: t("წევრობის მოთხოვნები", "Member requests"), count: pendingUsers.length, icon: <Users size={17} /> },
    { id: "profile-changes", label: t("პროფილის ცვლილებები", "Profile changes"), count: profileChanges.length, icon: <Users size={17} /> },
    { id: "pending-posts", label: t("პოსტების დამტკიცება", "Post approvals"), count: pendingTrainings.length, icon: <Cap size={17} /> },
    { id: "members", label: t("წევრები", "Members"), count: users.length, icon: <Users size={17} /> },
    { id: "content", label: t("კონტენტი", "Content"), count: trainings.length, icon: <List size={17} /> },
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
              onClick={() => setTab(item.id)}
            >
              <span className="ic">{item.icon}</span>
              <span className="lbl">{item.label}</span>
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
              <div className="admin-section-head">
                <h2>{t("წევრობის მოთხოვნები", "Member requests")}</h2>
                <p>{t("ადამიანები, რომლებიც ითხოვენ MedTer-ზე გაწევრიანებას", "People who asked to join MedTer")}</p>
              </div>
              {pendingUsers.length === 0
                ? empty(t("მოთხოვნები არ არის", "No requests"), t("ახალი რეგისტრაციები აქ გამოჩნდება.", "New registrations will appear here."), <Users size={42} />)
                : <div className="admin-queue">{pendingUsers.map(memberRequestCard)}</div>}
            </>
          )}

          {tab === "profile-changes" && (
            <>
              <div className="admin-section-head">
                <h2>{t("პროფილის ცვლილებები", "Profile changes")}</h2>
                <p>{t("მომხმარებლების მიერ მოთხოვნილი ინფორმაციის განახლებები", "User-requested profile information updates")}</p>
              </div>
              {profileChanges.length === 0
                ? empty(t("ცვლილებები არ არის", "No changes"), t("პროფილის განახლებები აქ გამოჩნდება.", "Profile updates will appear here."), <Users size={42} />)
                : <div className="admin-queue">{profileChanges.map(profileChangeCard)}</div>}
            </>
          )}

          {tab === "pending-posts" && (
            <>
              <div className="admin-section-head">
                <h2>{t("პოსტების დამტკიცება", "Post approvals")}</h2>
                <p>{t("ტრენინგ ცენტრების განცხადებები, რომლებიც ელოდება გამოქვეყნებას", "Training center posts waiting to go live")}</p>
              </div>
              {pendingTrainings.length === 0
                ? empty(t("ყველაფერი განხილულია", "All reviewed"), t("დასამტკიცებელი ტრენინგი არ არის.", "No trainings waiting for approval."), <Check size={42} />)
                : <div className="admin-queue">{pendingTrainings.map((a) => postApprovalCard(a))}</div>}
            </>
          )}

          {tab === "members" && (
            <>
              <div className="admin-section-head row">
                <div>
                  <h2>{t("წევრები", "Members")}</h2>
                  <p>{t("ყველა ექიმი და ტრენინგ ცენტრი", "All doctors and training centers")}</p>
                </div>
                <input
                  className="control admin-search"
                  value={memberFilter}
                  onChange={(e) => setMemberFilter(e.target.value)}
                  placeholder={t("ძიება სახელით, ელფოსტით…", "Search by name, email…")}
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
                              <button className="btn btn-ghost btn-sm" style={{ color: "var(--danger)" }} onClick={() => deleteUser(u.id)}>
                                <Trash size={14} />
                              </button>
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
                <div className="role-toggle admin-filter-toggle">
                  {(["all", "Pending", "Published", "Rejected", "Draft"] as const).map((f) => (
                    <button key={f} type="button" className={contentFilter === f ? "active" : ""} onClick={() => setContentFilter(f)}>
                      {f === "all" ? t("ყველა", "All") : statusLabel(f)}
                    </button>
                  ))}
                </div>
              </div>
              {filteredContent.length === 0
                ? empty(t("კონტენტი არ არის", "No content"), t("ტრენინგები აქ გამოჩნდება.", "Trainings will appear here."), <Cap size={42} />)
                : <div className="admin-queue">{filteredContent.map((a) => postApprovalCard(a))}</div>}
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
                        {settings.userVerificationEnabled ? t("ჩართულია", "On") : t("გამორთულია", "Off")}
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
                        {settings.announcementVerificationEnabled ? t("ჩართულია", "On") : t("გამორთულია", "Off")}
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
