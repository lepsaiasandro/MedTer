import { useEffect, useState } from "react";
import api from "../api";
import { usePrefs } from "../i18n";
import { Calendar, Pin, Mail, Check, Trash, List } from "../components/icons";

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
  centerName: string;
}

const MONTHS_KA = ["იანვარი", "თებერვალი", "მარტი", "აპრილი", "მაისი", "ივნისი", "ივლისი", "აგვისტო", "სექტემბერი", "ოქტომბერი", "ნოემბერი", "დეკემბერი"];
const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function AdminDashboard() {
  const { t, lang } = usePrefs();
  const [items, setItems] = useState<Announcement[]>([]);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [reason, setReason] = useState("");

  const fmtDate = (iso?: string) => { if (!iso) return t("თარიღი მიუთითებელი", "No date"); const d = new Date(iso); return isNaN(d.getTime()) ? "" : `${d.getDate()} ${(lang === "en" ? MONTHS_EN : MONTHS_KA)[d.getMonth()]}, ${d.getFullYear()}`; };

  const load = () => api.get<Announcement[]>("/announcements/pending").then((r) => setItems(r.data));
  useEffect(() => { load(); }, []);

  const approve = async (id: number) => { await api.post(`/announcements/${id}/approve`); load(); };
  const doReject = async () => {
    if (rejectId === null) return;
    await api.post(`/announcements/${rejectId}/reject`, { reason: reason.trim() || t("მიზეზი მითითებული არ არის", "No reason provided") });
    setRejectId(null);
    setReason("");
    load();
  };

  return (
    <div>
      <div className="page-head">
        <div className="h-text">
          <h1>{t("ადმინ პანელი", "Admin Panel")}</h1>
          <p>{t("დაათვალიერე და დაადასტურე ტრენინგ ცენტრების მიერ განთავსებული განცხადებები", "Review and approve announcements posted by training centers")}</p>
        </div>
      </div>

      <div className="stats" style={{ gridTemplateColumns: "repeat(2, 1fr)", maxWidth: 520 }}>
        <div className="stat">
          <div className="k"><span className="ic" style={{ background: "var(--warning-soft)", color: "var(--warning)" }}><List size={15} sw={2} /></span> {t("განხილვის მოლოდინში", "Awaiting review")}</div>
          <div className="v">{items.length}</div>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="empty">
          <div className="ill"><Check size={42} /></div>
          <h2>{t("ყველაფერი განხილულია 🎉", "All reviewed 🎉")}</h2>
          <p>{t("ამჟამად დასამტკიცებელი განცხადება არ არის. ახალი განცხადებები აქ გამოჩნდება.", "There are no announcements to approve right now. New ones will appear here.")}</p>
        </div>
      ) : (
        <div className="grid">
          {items.map((a) => (
            <article className="card" key={a.id}>
              <div className="media pv-media">
                {a.imageUrl
                  ? <img src={a.imageUrl} alt="" />
                  : <img src={`https://loremflickr.com/480/270/medical,training?lock=${a.id + 10}`} onError={(e) => { e.currentTarget.src = `https://picsum.photos/seed/a${a.id}/480/270`; }} alt="" />}
                <span className="badge-points"><span className="tealdot" /> {a.points} {t("ქულა", "pts")}</span>
                <span className="status draft">{t("განხილვაში", "Pending")}</span>
              </div>
              <div className="body">
                {a.category && <span className="chip-cat">{a.category}</span>}
                <h3>{a.title}</h3>
                <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: -4, fontWeight: 600 }}>{a.centerName}</div>
                {a.shortDescription && <p className="desc">{a.shortDescription}</p>}
                <div className="meta">
                  <div className="row"><Calendar size={15} /> {fmtDate(a.startDate)}</div>
                  <div className="row">
                    {a.format === "ონლაინ" ? <Mail size={15} /> : <Pin size={15} />}
                    {a.format === "ონლაინ" ? t("ონლაინ კურსი", "Online course") : `${a.city ? a.city + " · " : ""}${t("დასწრებით", "In person")}`}
                  </div>
                </div>
                <div className="foot" style={{ gap: 8 }}>
                  <button className="btn btn-ghost btn-sm" style={{ flex: 1, color: "var(--danger)", borderColor: "#f3c9c9" }} onClick={() => { setRejectId(a.id); setReason(""); }}>
                    <Trash size={15} /> {t("უარყოფა", "Reject")}
                  </button>
                  <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => approve(a.id)}>
                    <Check size={15} /> {t("დადასტურება", "Approve")}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {rejectId !== null && (
        <div className="modal" onClick={() => setRejectId(null)}>
          <div className="box" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div className="mhead">
              <div><h3>{t("განცხადების უარყოფა", "Reject announcement")}</h3><p>{t("მიუთითე მიზეზი — ცენტრი მიიღებს შეტყობინებას", "Provide a reason — the center will be notified")}</p></div>
              <button className="xbtn" onClick={() => setRejectId(null)}>×</button>
            </div>
            <div className="field">
              <label>{t("უარყოფის მიზეზი", "Rejection reason")}</label>
              <textarea className="control" value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("მაგ: ბანერი არ შეესაბამება მოთხოვნებს, თარიღი არასწორია…", "e.g. banner doesn't meet requirements, wrong date…")} />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
              <button className="btn btn-text" onClick={() => setRejectId(null)}>{t("გაუქმება", "Cancel")}</button>
              <button className="btn btn-primary" style={{ background: "var(--danger)" }} onClick={doReject}>{t("უარყოფა", "Reject")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
