import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import ShareMenu from "../components/ShareMenu";
import { usePrefs } from "../i18n";

/* ── types ──────────────────────────────────────────────────────────── */
interface Announcement {
  id: number;
  title: string;
  type?: string;
  category?: string;
  format?: string;
  shortDescription?: string;
  description?: string;
  city?: string;
  duration?: string;
  language?: string;
  points: number;
  price: number;
  seats?: number;
  imageUrl?: string;
  startDate?: string;
  registrationDeadline?: string;
  status: string;
  rejectionReason?: string;
  interestedCount: number;
  hasGroupChat?: boolean;
}

interface InterestedDoctor {
  userId: string;
  displayName: string;
  specialty?: string;
  city?: string;
  email: string;
  hasCertificate: boolean;
}

/* ── form model ─────────────────────────────────────────────────────── */
interface FormState {
  id?: number;
  type: string;
  title: string;
  category: string;
  format: string;
  shortDescription: string;
  description: string;
  startDate: string;
  duration: string;
  city: string;
  language: string;
  points: string;
  price: string;
  seats: string;
  registrationDeadline: string;
  imageUrl: string;
}

const emptyForm: FormState = {
  type: "კონფერენცია",
  title: "",
  category: "",
  format: "ონლაინ",
  shortDescription: "",
  description: "",
  startDate: "",
  duration: "",
  city: "",
  language: "ქართული",
  points: "",
  price: "",
  seats: "",
  registrationDeadline: "",
  imageUrl: "",
};

const STATUS_META: Record<string, { cls: string; ka: string; en: string }> = {
  Published: { cls: "pub", ka: "გამოქვეყნებული", en: "Published" },
  Pending: { cls: "pending", ka: "განხილვაში", en: "Pending" },
  Draft: { cls: "draft", ka: "მონახაზი", en: "Draft" },
  Rejected: { cls: "rejected", ka: "უარყოფილი", en: "Rejected" },
};

const CATEGORIES = [
  "კარდიოლოგია",
  "ნევროლოგია",
  "პედიატრია",
  "ქირურგია",
  "გადაუდებელი მედიცინა",
  "ზოგადი პრაქტიკა",
  "ონკოლოგია",
  "რადიოლოგია",
];

const MONTHS_KA = [
  "იანვარი", "თებერვალი", "მარტი", "აპრილი", "მაისი", "ივნისი",
  "ივლისი", "აგვისტო", "სექტემბერი", "ოქტომბერი", "ნოემბერი", "დეკემბერი",
];
const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function formatDate(iso: string | undefined, lang: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `${d.getDate()} ${(lang === "en" ? MONTHS_EN : MONTHS_KA)[d.getMonth()]}, ${d.getFullYear()}`;
}

/* ── reusable icons ─────────────────────────────────────────────────── */
const IcCalendar = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
);
const IcPin = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
);
const IcOnline = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 8.5V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-1.5" /><path d="m2 8 10 6 10-6" /></svg>
);
const IcEye = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>
);
const IcEdit = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>
);
const IcTrash = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></svg>
);
const IcChat = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
);
const IcCheck = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6 9 17l-5-5" /></svg>
);
const IcPlus = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 5v14M5 12h14" /></svg>
);

/* ════════════════════════════════════════════════════════════════════ */
export default function MyAnnouncements() {
  const { t, lang } = usePrefs();
  const [items, setItems] = useState<Announcement[]>([]);
  const [view, setView] = useState<"list" | "form">("list");
  const [form, setForm] = useState<FormState>(emptyForm);

  const [filter, setFilter] = useState<"all" | "Published" | "Pending" | "Draft" | "Rejected">("all");
  const [search, setSearch] = useState("");

  // interested-doctors modal
  const [modalId, setModalId] = useState<number | null>(null);
  const [interested, setInterested] = useState<InterestedDoctor[]>([]);
  const [notify, setNotify] = useState({ subject: "", message: "" });
  const [flash, setFlash] = useState("");
  const [drag, setDrag] = useState(false);
  const [certBusy, setCertBusy] = useState<string | null>(null);  // doctorUserId being uploaded
  const [certDone, setCertDone] = useState<string | null>(null);  // recently succeeded (green flash)

  const [verificationOn, setVerificationOn] = useState(true);
  const [globalVerificationOn, setGlobalVerificationOn] = useState(true);
  const [verBusy, setVerBusy] = useState(false);

  const load = () => api.get<Announcement[]>("/announcements/mine").then((r) => setItems(r.data));
  const loadVerification = () =>
    api.get<{ announcementVerificationEnabled: boolean; globalAnnouncementVerificationEnabled: boolean }>(
      "/users/me/verification-settings"
    ).then((r) => {
      setVerificationOn(r.data.announcementVerificationEnabled);
      setGlobalVerificationOn(r.data.globalAnnouncementVerificationEnabled);
    }).catch(() => {});

  useEffect(() => { load(); loadVerification(); }, []);

  const toggleVerification = async (enabled: boolean) => {
    if (!enabled && !confirm(t(
      "ვერიფიკაციის გამორთვისას თქვენი ტრენინგები ადმინის გარეშე გამოქვეყნდება. გაგრძელება?",
      "Disabling verification publishes your trainings without admin review. Continue?"
    ))) return;
    setVerBusy(true);
    try {
      const { data } = await api.put<{ announcementVerificationEnabled: boolean; globalAnnouncementVerificationEnabled: boolean }>(
        "/users/me/verification-settings",
        { announcementVerificationEnabled: enabled }
      );
      setVerificationOn(data.announcementVerificationEnabled);
      setGlobalVerificationOn(data.globalAnnouncementVerificationEnabled);
      await load();
    } finally {
      setVerBusy(false);
    }
  };

  const createGroupChat = async (announcementId: number) => {
    try {
      await api.post("/chat/groups", { announcementId });
      await load();
      alert(t("ჯგუფი შეიქმნა — რეგისტრირებული ექიმები დაემატნენ", "Group created — registered doctors were added"));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg || t("ჯგუფის შექმნა ვერ მოხერხდა", "Could not create group"));
    }
  };

  /* ── derived ── */
  const stats = useMemo(() => ({
    total: items.length,
    published: items.filter((a) => a.status === "Published").length,
    pending: items.filter((a) => a.status === "Pending").length,
    draft: items.filter((a) => a.status === "Draft").length,
    rejected: items.filter((a) => a.status === "Rejected").length,
  }), [items]);

  const visible = items.filter((a) => {
    if (filter !== "all" && a.status !== filter) return false;
    if (search && !a.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  /* ── form actions ── */
  const openCreate = () => { setForm(emptyForm); setView("form"); window.scrollTo(0, 0); };
  const openEdit = (a: Announcement) => {
    setForm({
      id: a.id,
      type: a.type || "კონფერენცია",
      title: a.title,
      category: a.category || "",
      format: a.format || "ონლაინ",
      shortDescription: a.shortDescription || "",
      description: a.description || "",
      startDate: a.startDate ? a.startDate.slice(0, 10) : "",
      duration: a.duration || "",
      city: a.city || "",
      language: a.language || "ქართული",
      points: a.points ? String(a.points) : "",
      price: a.price ? String(a.price) : "",
      seats: a.seats ? String(a.seats) : "",
      registrationDeadline: a.registrationDeadline ? a.registrationDeadline.slice(0, 10) : "",
      imageUrl: a.imageUrl || "",
    });
    setView("form");
    window.scrollTo(0, 0);
  };

  const submit = async (status: "Published" | "Draft") => {
    if (!form.title.trim()) { alert(t("გთხოვ შეავსე სათაური", "Please fill in the title")); return; }
    const body = {
      title: form.title.trim(),
      type: form.type,
      category: form.category || null,
      format: form.format,
      shortDescription: form.shortDescription || null,
      description: form.description || null,
      city: form.city || null,
      duration: form.duration || null,
      language: form.language || null,
      points: Number(form.points) || 0,
      price: Number(form.price) || 0,
      seats: form.seats ? Number(form.seats) : null,
      imageUrl: form.imageUrl || null,
      startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
      registrationDeadline: form.registrationDeadline ? new Date(form.registrationDeadline).toISOString() : null,
      status,
    };
    if (form.id) await api.put(`/announcements/${form.id}`, body);
    else await api.post("/announcements", body);
    setView("list");
    setForm(emptyForm);
    load();
  };

  const remove = async (id: number) => {
    if (!confirm(t("ნამდვილად წავშალო ეს განცხადება?", "Really delete this announcement?"))) return;
    await api.delete(`/announcements/${id}`);
    load();
  };

  const onPickBanner = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, imageUrl: String(reader.result) }));
    reader.readAsDataURL(file);
  };

  /* ── interested modal ── */
  const openInterested = async (id: number) => {
    const { data } = await api.get<InterestedDoctor[]>(`/announcements/${id}/interested`);
    setInterested(data);
    setNotify({ subject: "", message: "" });
    setFlash("");
    setModalId(id);
  };
  const sendNotify = async (id: number) => {
    const { data } = await api.post(`/announcements/${id}/notify`, notify);
    setFlash(lang === "en" ? `Sent to ${data.sent} recipients ✓` : `გაიგზავნა ${data.sent} მიმღებზე ✓`);
    setNotify({ subject: "", message: "" });
  };
  const issueCert = async (announcementId: number, doctorUserId: string, fileUrl: string, fileName: string) => {
    setCertBusy(doctorUserId);
    try {
      await api.post(`/announcements/${announcementId}/certificate`, { doctorUserId, fileUrl, fileName });
      const { data } = await api.get<InterestedDoctor[]>(`/announcements/${announcementId}/interested`);
      setInterested(data);
      setCertDone(doctorUserId);
      setTimeout(() => setCertDone((v) => (v === doctorUserId ? null : v)), 2500);
    } finally {
      setCertBusy(null);
    }
  };
  const onPickCert = (file: File | undefined, announcementId: number, doctorUserId: string) => {
    if (!file) return;
    if (file.type !== "application/pdf") { alert(t("მხოლოდ PDF ფაილია დაშვებული", "Only PDF files are allowed")); return; }
    if (file.size > 5 * 1024 * 1024) { alert(t("ფაილი არ უნდა აღემატებოდეს 5MB-ს", "File must be under 5MB")); return; }
    const reader = new FileReader();
    reader.onload = () => issueCert(announcementId, doctorUserId, String(reader.result), file.name);
    reader.readAsDataURL(file);
  };

  /* ════════════════ FORM VIEW ════════════════ */
  if (view === "form") {
    const pvDate = formatDate(form.startDate, lang);
    const priceLabel = Number(form.price) > 0 ? `${form.price} ₾` : t("უფასო", "Free");
    return (
      <div>
        <a className="back-link" onClick={() => setView("list")}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          {t("ჩემი განცხადებები", "My Announcements")}
        </a>

        <div className="page-head">
          <div className="h-text">
            <h1>{form.id ? t("განცხადების რედაქტირება", "Edit announcement") : t("ახალი განცხადება", "New announcement")}</h1>
            <p>{t("შეავსე ინფორმაცია — ცოცხალი პრევიუ მარჯვნივ გაჩვენებს, როგორ დაინახავენ ექიმები", "Fill in the info — the live preview on the right shows how doctors will see it")}</p>
          </div>
        </div>

        <div className="form-layout">
          {/* LEFT: form */}
          <div>
            {/* section 1 */}
            <div className="fcard">
              <div className="fcard-head">
                <span className="num">1</span>
                <div><h2>{t("ძირითადი ინფორმაცია", "Basic info")}</h2><p>{t("რა ტიპისაა და რაზეა განცხადება", "What type it is and what it's about")}</p></div>
              </div>

              <div className="field">
                <label>{t("განცხადების ტიპი", "Announcement type")} <span className="req">*</span></label>
                <div className="type-toggle">
                  <div className={`type-opt ${form.type === "კონფერენცია" ? "sel" : ""}`} onClick={() => setForm({ ...form, type: "კონფერენცია" })}>
                    <span className="to-ic"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg></span>
                    <div><div className="to-t">{t("კონფერენცია", "Conference")}</div><div className="to-d">{t("დიდი მასშტაბის ღონისძიება", "Large-scale event")}</div></div>
                  </div>
                  <div className={`type-opt ${form.type === "ტრენინგი" ? "sel" : ""}`} onClick={() => setForm({ ...form, type: "ტრენინგი" })}>
                    <span className="to-ic"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></svg></span>
                    <div><div className="to-t">{t("ტრენინგი", "Training")}</div><div className="to-d">{t("პრაქტიკული სასწავლო კურსი", "Hands-on course")}</div></div>
                  </div>
                </div>
              </div>

              <div className="field">
                <label>{t("სათაური", "Title")} <span className="req">*</span></label>
                <input className="control" placeholder={t("მაგ: Cardio Update 2026 — გულის უკმარისობის მართვა", "e.g. Cardio Update 2026 — heart failure management")}
                  value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>

              <div className="field-grid">
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>{t("კატეგორია / სპეციალობა", "Category / specialty")} <span className="req">*</span></label>
                  <select className="control" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    <option value="">{t("აირჩიე კატეგორია…", "Choose a category…")}</option>
                    {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>{t("ფორმატი", "Format")} <span className="req">*</span></label>
                  <div className="radio-row">
                    {["ონლაინ", "დასწრებით"].map((f) => (
                      <label key={f} className={`radio-opt ${form.format === f ? "sel" : ""}`} onClick={() => setForm({ ...form, format: f })}>
                        <span className="radio-dot" /><span>{f === "ონლაინ" ? t("ონლაინ", "Online") : t("დასწრებით", "In person")}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* section 2 */}
            <div className="fcard">
              <div className="fcard-head">
                <span className="num">2</span>
                <div><h2>{t("დეტალები და განრიგი", "Details & schedule")}</h2><p>{t("აღწერა, თარიღი და ადგილმდებარეობა", "Description, date and location")}</p></div>
              </div>

              <div className="field">
                <label>{t("მოკლე აღწერა", "Short description")} <span className="char"><b>{form.shortDescription.length}</b>/120</span></label>
                <input className="control" maxLength={120} placeholder={t("ერთი წინადადება, რომელიც ბარათზე გამოჩნდება", "One sentence shown on the card")}
                  value={form.shortDescription} onChange={(e) => setForm({ ...form, shortDescription: e.target.value })} />
              </div>

              <div className="field">
                <label>{t("დეტალური აღწერა", "Detailed description")}</label>
                <textarea className="control" placeholder={t("აღწერე პროგრამა, სპიკერები, ვისთვისაა განკუთვნილი და რას ისწავლიან მონაწილეები…", "Describe the program, speakers, who it's for and what participants will learn…")}
                  value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>

              <div className="field-grid">
                <div className="field">
                  <label>{t("თარიღი", "Date")} <span className="req">*</span></label>
                  <input className="control" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                </div>
                <div className="field">
                  <label>{t("ხანგრძლივობა", "Duration")}</label>
                  <input className="control" placeholder={t("მაგ: 6 საათი / 2 დღე", "e.g. 6 hours / 2 days")} value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} />
                </div>
              </div>
              <div className="field-grid">
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>{t("მდებარეობა", "Location")}</label>
                  <input className="control" placeholder={t("მაგ: თბილისი, Radisson Blu — ან „ონლაინ, Zoom“", "e.g. Tbilisi, Radisson Blu — or 'online, Zoom'")}
                    value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>{t("ენა", "Language")}</label>
                  <select className="control" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}>
                    <option>ქართული</option>
                    <option>ინგლისური</option>
                    <option>ქართული / ინგლისური</option>
                  </select>
                </div>
              </div>
            </div>

            {/* section 3 */}
            <div className="fcard">
              <div className="fcard-head">
                <span className="num">3</span>
                <div><h2>{t("რეგისტრაცია და ქულები", "Registration & points")}</h2><p>{t("უსდ ქულა, ფასი და ადგილების ლიმიტი", "CPD points, price and seat limit")}</p></div>
              </div>
              <div className="field-grid">
                <div className="field">
                  <label>{t("უსდ ქულა", "CPD points")} <span className="req">*</span></label>
                  <input className="control" type="number" min={0} placeholder={t("მაგ: 20", "e.g. 20")} value={form.points} onChange={(e) => setForm({ ...form, points: e.target.value })} />
                  <div className="hint">{t("უწყვეტი სამედიცინო განათლების ქულა", "Continuing medical education points")}</div>
                </div>
                <div className="field">
                  <label>{t("ფასი (₾)", "Price (₾)")}</label>
                  <input className="control" type="number" min={0} placeholder={t("0 = უფასო", "0 = free")} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                </div>
              </div>
              <div className="field-grid">
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>{t("ადგილების რაოდენობა", "Number of seats")}</label>
                  <input className="control" type="number" min={1} placeholder={t("მაგ: 50", "e.g. 50")} value={form.seats} onChange={(e) => setForm({ ...form, seats: e.target.value })} />
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>{t("რეგისტრაციის ბოლო ვადა", "Registration deadline")}</label>
                  <input className="control" type="date" value={form.registrationDeadline} onChange={(e) => setForm({ ...form, registrationDeadline: e.target.value })} />
                </div>
              </div>
            </div>

            {/* section 4 */}
            <div className="fcard">
              <div className="fcard-head">
                <span className="num">4</span>
                <div><h2>{t("ბანერი", "Banner")}</h2><p>{t("მთავარი სურათი, რომელიც ბარათსა და გვერდზე გამოჩნდება", "The main image shown on the card and page")}</p></div>
              </div>
              <label
                className={`dropzone ${drag ? "drag" : ""}`}
                onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => { e.preventDefault(); setDrag(false); onPickBanner(e.dataTransfer.files?.[0]); }}
              >
                {form.imageUrl ? (
                  <img className="dz-preview" src={form.imageUrl} alt="banner" />
                ) : (
                  <>
                    <div className="dz-ic"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M17 8l-5-5-5 5M12 3v12" /></svg></div>
                    <div className="dz-t"><b>{t("ატვირთე ფაილი", "Upload a file")}</b> {t("ან ჩააგდე აქ", "or drop it here")}</div>
                    <div className="dz-d">{t("JPG ან PNG · რეკომ. 1200×630px · მაქს. 5MB", "JPG or PNG · rec. 1200×630px · max 5MB")}</div>
                  </>
                )}
                <input type="file" accept="image/*" hidden onChange={(e) => onPickBanner(e.target.files?.[0] || undefined)} />
              </label>
              {form.imageUrl && (
                <button className="btn btn-text" style={{ marginTop: 8 }} onClick={() => setForm({ ...form, imageUrl: "" })}>
                  {t("ბანერის წაშლა", "Remove banner")}
                </button>
              )}
            </div>

            {/* sticky actions */}
            <div className="form-actions">
              <span className="note">{t("გამოქვეყნებამდე განცხადება ადმინისტრატორის დასადასტურებლად გაიგზავნება", "Before publishing, the announcement is sent to an administrator for approval")}</span>
              <div className="spacer" />
              <button className="btn btn-text" onClick={() => setView("list")}>{t("გაუქმება", "Cancel")}</button>
              <button className="btn btn-ghost" onClick={() => submit("Draft")}>{t("მონახაზად შენახვა", "Save as draft")}</button>
              <button className="btn btn-primary" onClick={() => submit("Published")}>{t("დადასტურებაზე გაგზავნა", "Send for approval")}</button>
            </div>
          </div>

          {/* RIGHT: live preview + tips */}
          <aside className="side">
            <div>
              <div className="side-label" style={{ marginBottom: 10 }}>{t("ცოცხალი პრევიუ", "Live preview")}</div>
              <article className="card">
                <div className="media pv-media" style={{ aspectRatio: "16/9" }}>
                  {form.imageUrl ? (
                    <img src={form.imageUrl} alt="" />
                  ) : (
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-5-5L5 21" /></svg>
                  )}
                  <span className="badge-points"><span className="tealdot" /> {form.points || 0} {t("ქულა", "pts")}</span>
                  <span className="status draft">{t("პრევიუ", "Preview")}</span>
                </div>
                <div className="body">
                  <span className="chip-cat">{form.category || t("კატეგორია", "Category")}</span>
                  <h3>{form.title || t("განცხადების სათაური", "Announcement title")}</h3>
                  <div className="meta">
                    <div className="row">{IcCalendar} <span>{pvDate || t("თარიღი", "Date")}</span></div>
                    <div className="row">{form.format === "ონლაინ" ? IcOnline : IcPin} <span>{form.city || (form.format === "ონლაინ" ? t("ონლაინ", "Online") : t("დასწრებით", "In person"))}</span></div>
                  </div>
                  <div className="foot">
                    <div className="reg" style={{ color: "var(--teal)", fontWeight: 700 }}>{priceLabel}</div>
                    <button className="btn btn-ghost" style={{ padding: "7px 14px", fontSize: 13 }}>{t("დეტალურად", "Details")}</button>
                  </div>
                </div>
              </article>
            </div>

            <div className="tips">
              <h4><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.3h6c0-1 .4-1.8 1-2.3A7 7 0 0 0 12 2z" /></svg> {t("რჩევები კარგი განცხადებისთვის", "Tips for a great announcement")}</h4>
              <ul>
                <li>{IcCheck} {t("სათაურში მიუთითე კონკრეტული თემა და წელი", "Include a specific topic and year in the title")}</li>
                <li>{IcCheck} {t("ბანერი მკვეთრი და პროფესიული აირჩიე", "Choose a sharp, professional banner")}</li>
                <li>{IcCheck} {t("უსდ ქულის სიზუსტე ზრდის ნდობას", "Accurate CPD points build trust")}</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    );
  }

  /* ════════════════ EMPTY STATE ════════════════ */
  if (items.length === 0) {
    return (
      <div>
        <div className="page-head">
          <div className="h-text">
            <h1>{t("ჩემი განცხადებები", "My Announcements")}</h1>
            <p>{t("მართე შენი კონფერენციები და ტრენინგები, თვალი ადევნე რეგისტრაციებს", "Manage your conferences and trainings, track registrations")}</p>
          </div>
        </div>
        <div className="empty">
          <div className="ill">
            <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" /><path d="M12 12v4M10 14h4" strokeWidth="2" /></svg>
          </div>
          <h2>{t("ჯერ არ დაგიმატებია განცხადება", "You haven't added an announcement yet")}</h2>
          <p>{t("გამოაქვეყნე შენი პირველი კონფერენცია ან ტრენინგი და დააკავშირე ის ათასობით ექიმთან, რომლებიც ეძებენ პროფესიულ განვითარებას.", "Publish your first conference or training and connect it with thousands of doctors seeking professional growth.")}</p>
          <button className="btn btn-primary btn-lg" onClick={openCreate}>{IcPlus} {t("პირველი განცხადების დამატება", "Add your first announcement")}</button>
        </div>
      </div>
    );
  }

  /* ════════════════ LIST VIEW ════════════════ */
  return (
    <div>
      <div className="page-head">
        <div className="h-text">
          <h1>{t("ჩემი განცხადებები", "My Announcements")}</h1>
          <p>{t("მართე შენი კონფერენციები და ტრენინგები, თვალი ადევნე რეგისტრაციებს", "Manage your conferences and trainings, track registrations")}</p>
        </div>
        <div className="spacer" />
        <button className="btn btn-primary btn-lg" onClick={openCreate}>{IcPlus} {t("ახალი განცხადება", "New announcement")}</button>
      </div>

      <div className="card" style={{ padding: "16px 18px", marginBottom: 18, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14.5, color: "var(--text)" }}>
            {t("ტრენინგების ვერიფიკაცია", "Training verification")}
          </div>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted)", lineHeight: 1.45 }}>
            {!globalVerificationOn
              ? t("ადმინმა გლობალურად გამორთო ტრენინგების ვერიფიკაცია — ყველა ტრენინგი მაშინვე ქვეყნდება.", "Admin disabled training verification globally — all trainings publish immediately.")
              : verificationOn
                ? t("ჩართულია: გამოქვეყნება ადმინის დამტკიცებას ელოდება (შეუძლია უარყოფაც).", "On: publishing waits for admin approval (admin can also reject).")
                : t("გამორთულია: თქვენი ტრენინგები ადმინის გარეშე გამოქვეყნდება.", "Off: your trainings publish without admin review.")}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
          <span className={`status ${verificationOn && globalVerificationOn ? "pending" : "pub"}`} style={{ position: "static" }}>
            {verificationOn && globalVerificationOn ? t("ჩართულია", "On") : t("გამორთულია", "Off")}
          </span>
          <button
            className="btn btn-ghost btn-sm"
            disabled={verBusy || !globalVerificationOn}
            onClick={() => void toggleVerification(!verificationOn)}
            title={!globalVerificationOn ? t("გლობალურად გამორთულია ადმინის მიერ", "Globally disabled by admin") : undefined}
          >
            {verificationOn
              ? t("გამორთვა", "Disable")
              : t("ჩართვა", "Enable")}
          </button>
        </div>
      </div>

      {/* stat strip */}
      <div className="stats">
        <div className="stat">
          <div className="k"><span className="ic" style={{ background: "var(--brand-soft)", color: "var(--brand)" }}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18" /></svg></span> {t("სულ განცხადება", "Total")}</div>
          <div className="v">{stats.total}</div>
        </div>
        <div className="stat">
          <div className="k"><span className="ic" style={{ background: "var(--success-soft)", color: "var(--success)" }}>{IcCheck}</span> {t("გამოქვეყნებული", "Published")}</div>
          <div className="v">{stats.published}</div>
        </div>
        <div className="stat">
          <div className="k"><span className="ic" style={{ background: "var(--warning-soft)", color: "var(--warning)" }}>{IcEye}</span> {t("განხილვაში", "Pending")}</div>
          <div className="v">{stats.pending}</div>
        </div>
        <div className="stat">
          <div className="k"><span className="ic" style={{ background: "var(--surface-2)", color: "var(--muted)" }}>{IcEdit}</span> {t("მონახაზი", "Draft")}</div>
          <div className="v">{stats.draft}</div>
        </div>
      </div>

      {/* toolbar */}
      <div className="toolbar">
        <div className="segment">
          <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>{t("ყველა", "All")} <span className="count">{stats.total}</span></button>
          <button className={filter === "Published" ? "active" : ""} onClick={() => setFilter("Published")}>{t("გამოქვეყნებული", "Published")} <span className="count">{stats.published}</span></button>
          <button className={filter === "Pending" ? "active" : ""} onClick={() => setFilter("Pending")}>{t("განხილვაში", "Pending")} <span className="count">{stats.pending}</span></button>
          <button className={filter === "Draft" ? "active" : ""} onClick={() => setFilter("Draft")}>{t("მონახაზი", "Draft")} <span className="count">{stats.draft}</span></button>
          {stats.rejected > 0 && <button className={filter === "Rejected" ? "active" : ""} onClick={() => setFilter("Rejected")}>{t("უარყოფილი", "Rejected")} <span className="count">{stats.rejected}</span></button>}
        </div>
        <div className="search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
          <input placeholder={t("ძებნა სათაურით…", "Search by title…")} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {/* cards */}
      {visible.length === 0 ? (
        <div className="empty">
          <div className="ill">
            <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" /><path d="M12 12v4M10 14h4" strokeWidth="2" /></svg>
          </div>
          <h2>{t("განცხადება ვერ მოიძებნა", "No announcements found")}</h2>
          <p>{t("ამ ფილტრით განცხადება ვერ მოიძებნა.", "No announcements match this filter.")}</p>
        </div>
      ) : (
        <div className="grid">
          {visible.map((a) => {
            const published = a.status === "Published";
            const st = STATUS_META[a.status] ?? STATUS_META.Draft;
            const pct = a.seats ? Math.min(100, Math.round((a.interestedCount / a.seats) * 100)) : 0;
            return (
              <article className="card" key={a.id}>
                <div className="media pv-media">
                  {a.imageUrl ? (
                    <img src={a.imageUrl} alt="" style={published ? undefined : { filter: "grayscale(.35) opacity(.9)" }} />
                  ) : (
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-5-5L5 21" /></svg>
                  )}
                  <span className="badge-points"><span className="tealdot" /> {a.points} {t("ქულა", "pts")}</span>
                  <span className={`status ${st.cls}`}>{t(st.ka, st.en)}</span>
                </div>
                <div className="body">
                  {(a.category || a.type) && <span className="chip-cat">{a.category || a.type}</span>}
                  <h3>{a.title}</h3>
                  <div className="meta">
                    <div className="row">{IcCalendar} {formatDate(a.startDate, lang) || t("თარიღი მიუთითებელი", "No date")}</div>
                    <div className="row">
                      {a.format === "ონლაინ" ? IcOnline : IcPin}
                      {a.format === "ონლაინ" ? t("ონლაინ კურსი", "Online course") : `${a.city ? a.city + " · " : ""}${t("დასწრებით", "In person")}`}
                    </div>
                  </div>
                  {a.status === "Rejected" && a.rejectionReason && (
                    <div style={{ fontSize: 12, color: "var(--danger)", background: "var(--danger-soft)", padding: "6px 10px", borderRadius: 8 }}>
                      {t("უარყოფის მიზეზი", "Rejection reason")}: {a.rejectionReason}
                    </div>
                  )}
                  <div className="foot">
                    {a.status === "Published" ? (
                      a.seats ? (
                        <div className="reg"><div className="bar"><i style={{ width: `${pct}%` }} /></div> {a.interestedCount}/{a.seats}</div>
                      ) : (
                        <div className="reg">{a.interestedCount} {t("დაინტერესდა", "interested")}</div>
                      )
                    ) : a.status === "Pending" ? (
                      <div className="reg" style={{ color: "var(--warning)" }}>{t("ელოდება დადასტურებას", "Awaiting approval")}</div>
                    ) : a.status === "Rejected" ? (
                      <div className="reg" style={{ color: "var(--danger)" }}>{t("უარყოფილია", "Rejected")}</div>
                    ) : (
                      <div className="reg" style={{ color: "var(--soft)" }}>{t("ჯერ არ გამოქვეყნებულა", "Not published yet")}</div>
                    )}
                    <div className="card-actions">
                      {published && <ShareMenu title={a.title} />}
                      {published && !a.hasGroupChat && (
                        <button
                          className="act"
                          title={t("ჯგუფური ჩატის შექმნა", "Create group chat")}
                          onClick={() => createGroupChat(a.id)}
                        >
                          {IcChat}
                        </button>
                      )}
                      {published && a.hasGroupChat && (
                        <Link className="act" to="/chat" title={t("ჯგუფური ჩატი", "Group chat")}>{IcChat}</Link>
                      )}
                      {published && (
                        <button className="act" title={t("დაინტერესებულები", "Interested doctors")} onClick={() => openInterested(a.id)}>{IcEye}</button>
                      )}
                      <button className="act" title={t("რედაქტირება", "Edit")} onClick={() => openEdit(a)}>{IcEdit}</button>
                      <button className="act del" title={t("წაშლა", "Delete")} onClick={() => remove(a.id)}>{IcTrash}</button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* interested-doctors modal */}
      {modalId !== null && (
        <div className="modal" onClick={() => setModalId(null)}>
          <div className="box" onClick={(e) => e.stopPropagation()}>
            <div className="mhead">
              <div>
                <h3>{t("დაინტერესებული ექიმები", "Interested doctors")}</h3>
                <p>{interested.length} {t("ექიმი დაინტერესდა ამ განცხადებით", "doctors interested in this announcement")}</p>
              </div>
              <button className="xbtn" onClick={() => setModalId(null)}>×</button>
            </div>

            {interested.length === 0 ? (
              <p style={{ color: "var(--soft)", fontSize: 13 }}>{t("ჯერ არავინ დაინტერესებულა.", "Nobody interested yet.")}</p>
            ) : (
              <>
                <div>
                  {interested.map((d) => {
                    const busy = certBusy === d.userId;
                    const done = certDone === d.userId;
                    return (
                    <div className="drow" key={d.userId}
                      style={done ? { background: "var(--teal-soft)", borderRadius: 8, transition: "background .3s" } : { transition: "background .3s" }}>
                      <span className="dav">{d.displayName.charAt(0)}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="dname">{d.displayName}</div>
                        <div className="dmeta">{d.specialty ? `${d.specialty} · ` : ""}{d.email}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" }}>
                        {(d.hasCertificate || done) && (
                          <span style={{ fontSize: 12, color: "var(--success)", fontWeight: 700, background: "var(--teal-soft)", padding: "4px 9px", borderRadius: "var(--r-pill)" }}>
                            {done ? t("აიტვირთა ✓", "Uploaded ✓") : t("გაცემულია ✓", "Issued ✓")}
                          </span>
                        )}
                        <label className="btn btn-ghost btn-sm" style={{ cursor: busy ? "wait" : "pointer", opacity: busy ? 0.6 : 1 }}>
                          {busy ? t("იტვირთება…", "Uploading…") : d.hasCertificate ? t("ხელახლა ატვირთვა", "Re-upload") : t("PDF-ის ატვირთვა", "Upload PDF")}
                          <input type="file" accept="application/pdf" hidden disabled={busy} onChange={(e) => onPickCert(e.target.files?.[0], modalId, d.userId)} />
                        </label>
                      </div>
                    </div>
                    );
                  })}
                </div>

                <div style={{ marginTop: 18 }}>
                  <div className="fcard" style={{ marginBottom: 0, padding: 16 }}>
                    <div className="field">
                      <label>{t("შეტყობინების გაგზავნა მეილზე", "Send an email notification")}</label>
                      <input className="control" placeholder={t("თემა", "Subject")} value={notify.subject}
                        onChange={(e) => setNotify({ ...notify, subject: e.target.value })} />
                    </div>
                    <div className="field">
                      <textarea className="control" placeholder={t("ტექსტი", "Message")} value={notify.message}
                        onChange={(e) => setNotify({ ...notify, message: e.target.value })} />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <button className="btn btn-primary" disabled={!notify.subject} onClick={() => sendNotify(modalId)}>{t("გაგზავნა", "Send")}</button>
                      {flash && <span style={{ color: "var(--teal)", fontSize: 13, fontWeight: 600 }}>{flash}</span>}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
