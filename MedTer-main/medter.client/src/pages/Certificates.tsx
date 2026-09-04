import { useEffect, useState } from "react";
import api from "../api";
import { usePrefs } from "../i18n";
import { Doc, Calendar, Check } from "../components/icons";

interface Certificate {
  id: number;
  title: string;
  points: number;
  centerName: string;
  issuedAt: string;
  announcementId?: number;
  fileUrl?: string;
  fileName?: string;
}

const MONTHS_KA = ["იანვარი", "თებერვალი", "მარტი", "აპრილი", "მაისი", "ივნისი", "ივლისი", "აგვისტო", "სექტემბერი", "ოქტომბერი", "ნოემბერი", "დეკემბერი"];
const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function Certificates() {
  const { t, lang } = usePrefs();
  const [items, setItems] = useState<Certificate[]>([]);
  useEffect(() => { api.get<Certificate[]>("/certificates/mine").then((r) => setItems(r.data)); }, []);

  const fmtDate = (iso: string) => { const d = new Date(iso); return isNaN(d.getTime()) ? "" : `${d.getDate()} ${(lang === "en" ? MONTHS_EN : MONTHS_KA)[d.getMonth()]}, ${d.getFullYear()}`; };
  const totalPoints = items.reduce((s, c) => s + c.points, 0);

  return (
    <div>
      <div className="page-head">
        <div className="h-text">
          <h1>{t("ჩემი სერტიფიკატები", "My Certificates")}</h1>
          <p>{t("ტრენინგებზე მიღებული სერტიფიკატები და დაგროვილი უსდ ქულები", "Certificates earned at trainings and accumulated CPD points")}</p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="empty">
          <div className="ill"><Doc size={42} sw={1.6} /></div>
          <h2>{t("ჯერ არ გაქვს სერტიფიკატი", "No certificates yet")}</h2>
          <p>{t("როცა ტრენინგ ცენტრი ტრენინგის გავლის შემდეგ გამოგცემს სერტიფიკატს, ის აქ გამოჩნდება.", "Once a training center issues you a certificate after a training, it will appear here.")}</p>
        </div>
      ) : (
        <>
          <div className="stats" style={{ gridTemplateColumns: "repeat(2, 1fr)", maxWidth: 520 }}>
            <div className="stat">
              <div className="k"><span className="ic" style={{ background: "var(--brand-soft)", color: "var(--brand)" }}><Doc size={15} sw={2} /></span> {t("სულ სერტიფიკატი", "Total certificates")}</div>
              <div className="v">{items.length}</div>
            </div>
            <div className="stat">
              <div className="k"><span className="ic" style={{ background: "var(--teal-soft)", color: "var(--teal)" }}><Check size={15} /></span> {t("ჯამური ქულა", "Total points")}</div>
              <div className="v">{totalPoints}</div>
            </div>
          </div>

          <div className="grid">
            {items.map((c) => (
              <article className="card" key={c.id}>
                <div style={{ background: "linear-gradient(120deg, var(--brand), var(--navy) 140%)", color: "#fff", padding: "16px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 13 }}><Doc size={18} /> {t("სერტიფიკატი", "Certificate")}</span>
                  <span className="badge-points" style={{ position: "static", background: "rgba(255,255,255,.18)" }}><span className="tealdot" /> +{c.points} {t("ქულა", "pts")}</span>
                </div>
                <div className="body">
                  <h3>{c.title}</h3>
                  <div className="meta">
                    <div className="row" style={{ fontWeight: 600, color: "var(--text-body)" }}>{c.centerName}</div>
                    <div className="row"><Calendar size={15} /> {fmtDate(c.issuedAt)}</div>
                  </div>
                  <div className="foot" style={{ borderTop: "none", paddingTop: 4 }}>
                    {c.fileUrl ? (
                      <a className="btn btn-primary btn-sm btn-block" href={c.fileUrl} download={c.fileName || "certificate.pdf"}>
                        <Doc size={15} /> {t("PDF ჩამოტვირთვა", "Download PDF")}
                      </a>
                    ) : (
                      <span style={{ fontSize: 12, color: "var(--soft)" }}>{t("PDF ფაილი არ არის ატვირთული", "No PDF uploaded")}</span>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
