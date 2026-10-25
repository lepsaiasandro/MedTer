import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { usePrefs } from "../i18n";

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

type FieldKey = "title" | "category" | "startDate" | "points" | "city" | "meetingAccess";

export default function AddTrainingModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { t } = usePrefs();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [format, setFormat] = useState("ონლაინ");
  const [startDate, setStartDate] = useState("");
  const [points, setPoints] = useState("");
  const [city, setCity] = useState("");
  const [meetingAccess, setMeetingAccess] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [saving, setSaving] = useState<"Published" | "Draft" | null>(null);

  const submit = async (status: "Published" | "Draft") => {
    const next: Partial<Record<FieldKey, string>> = {};
    if (!title.trim()) next.title = t("სათაური სავალდებულოა", "Title is required");
    if (status === "Published") {
      if (!category) next.category = t("აირჩიე კატეგორია", "Choose a category");
      if (!startDate) next.startDate = t("მიუთითე თარიღი და დრო", "Set the date and time");
      if (points.trim() === "" || Number.isNaN(Number(points)) || Number(points) < 0) {
        next.points = t("მიუთითე უპგ ქულა", "Enter CPD points");
      }
      if (format !== "ონლაინ" && !city.trim()) next.city = t("ქალაქი სავალდებულოა", "City is required");
      if (format !== "დასწრებით") {
        const link = meetingAccess.trim();
        if (!link) next.meetingAccess = t("შეხვედრის ლინკი სავალდებულოა", "Meeting link is required");
        else if (!/^https?:\/\//i.test(link)) next.meetingAccess = t("ლინკი https://-ით უნდა იწყებოდეს", "The link must start with https://");
      }
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const start = startDate ? new Date(startDate) : null;
    setSaving(status);
    try {
      await api.post("/announcements", {
        title: title.trim(),
        type: "ტრენინგი",
        category: category || null,
        format,
        shortDescription: shortDescription.trim() || null,
        city: city.trim() || null,
        meetingAccess: meetingAccess.trim() || null,
        points: Number(points) || 0,
        price: 0,
        startDate: start && !isNaN(start.getTime()) ? start.toISOString() : null,
        status,
      });
      onSaved();
      onClose();
    } catch (e: unknown) {
      const data = (e as { response?: { status?: number; data?: { message?: string; code?: string } } })?.response;
      if (data?.status === 402 || data?.data?.code === "subscription_required") {
        const go = confirm(
          (data.data?.message || t("გამოქვეყნებისთვის საჭიროა Center Pro.", "Center Pro is required to publish."))
          + "\n\n"
          + t("გახსნა პროფილის გამოწერა?", "Open subscription in profile?")
        );
        if (go) navigate("/profile#subscription");
        return;
      }
      alert(data?.data?.message || t("შენახვა ვერ მოხერხდა", "Save failed"));
    } finally {
      setSaving(null);
    }
  };

  const err = (key: FieldKey) => errors[key]
    ? <div className="hint" style={{ color: "var(--danger)" }}>{errors[key]}</div>
    : null;

  return (
    <div className="modal" style={{ zIndex: 200 }} onClick={onClose}>
      <div className="box" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
        <div className="mhead">
          <div>
            <h3>{t("ტრენინგის დამატება", "Add training")}</h3>
            <p>{t("აქვე ივსება და ფიდზე ჩნდება. სხვა გვერდზე არ გადახვალ.", "Fill it in here and it shows on the feed. You stay on this page.")}</p>
          </div>
          <button type="button" className="xbtn" onClick={onClose} aria-label={t("დახურვა", "Close")}>×</button>
        </div>

        {Object.keys(errors).length > 0 && (
          <div className="auth-error">{t("შეავსე მონიშნული ველები", "Fill in the marked fields")}</div>
        )}

        <div className="field">
          <label>{t("სათაური", "Title")} <span className="req">*</span></label>
          <input className="control" value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder={t("მაგ: Cardio Update 2026", "e.g. Cardio Update 2026")}
            style={errors.title ? { borderColor: "var(--danger)" } : undefined} />
          {err("title")}
        </div>

        <div className="field-grid">
          <div className="field">
            <label>{t("კატეგორია", "Category")} <span className="req">*</span></label>
            <select className="control" value={category} onChange={(e) => setCategory(e.target.value)}
              style={errors.category ? { borderColor: "var(--danger)" } : undefined}>
              <option value="">{t("აირჩიე…", "Choose…")}</option>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            {err("category")}
          </div>
          <div className="field">
            <label>{t("ფორმატი", "Format")}</label>
            <select className="control" value={format} onChange={(e) => setFormat(e.target.value)}>
              <option value="ონლაინ">{t("ონლაინ", "Online")}</option>
              <option value="დასწრებით">{t("დასწრებით", "In person")}</option>
              <option value="ჰიბრიდული">{t("ჰიბრიდი", "Hybrid")}</option>
            </select>
          </div>
        </div>

        <div className="field-grid">
          <div className="field">
            <label>{t("თარიღი და დრო", "Date and time")} <span className="req">*</span></label>
            <input className="control" type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)}
              style={errors.startDate ? { borderColor: "var(--danger)" } : undefined} />
            {err("startDate")}
          </div>
          <div className="field">
            <label>{t("უპგ ქულა", "CPD points")} <span className="req">*</span></label>
            <input className="control" type="number" min={0} value={points} onChange={(e) => setPoints(e.target.value)}
              placeholder="20" style={errors.points ? { borderColor: "var(--danger)" } : undefined} />
            {err("points")}
          </div>
        </div>

        {format !== "ონლაინ" && (
          <div className="field">
            <label>{t("ქალაქი", "City")} <span className="req">*</span></label>
            <input className="control" value={city} onChange={(e) => setCity(e.target.value)}
              placeholder={t("მაგ: თბილისი", "e.g. Tbilisi")}
              style={errors.city ? { borderColor: "var(--danger)" } : undefined} />
            {err("city")}
          </div>
        )}

        {format !== "დასწრებით" && (
          <div className="field">
            <label>{t("შეხვედრის ლინკი", "Meeting link")} <span className="req">*</span></label>
            <input className="control" value={meetingAccess} onChange={(e) => setMeetingAccess(e.target.value)}
              placeholder="https://zoom.us/j/…"
              style={errors.meetingAccess ? { borderColor: "var(--danger)" } : undefined} />
            {err("meetingAccess")}
          </div>
        )}

        {format === "დასწრებით" && (
          <div className="field">
            <label>{t("ზუსტი მისამართი", "Exact address")}</label>
            <input className="control" value={meetingAccess} onChange={(e) => setMeetingAccess(e.target.value)}
              placeholder={t("მაგ: თბილისი, რადისონ ბლუ", "e.g. Tbilisi, Radisson Blu")} />
          </div>
        )}

        <div className="field">
          <label>{t("მოკლე აღწერა", "Short description")}</label>
          <input className="control" maxLength={120} value={shortDescription} onChange={(e) => setShortDescription(e.target.value)}
            placeholder={t("ერთი წინადადება ბარათისთვის", "One sentence for the card")} />
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "flex-end" }}>
          <button type="button" className="btn btn-text" onClick={onClose} disabled={!!saving}>{t("გაუქმება", "Cancel")}</button>
          <button type="button" className="btn btn-ghost" onClick={() => submit("Draft")} disabled={!!saving}>
            {saving === "Draft" ? t("ინახება…", "Saving…") : t("მონახაზი", "Draft")}
          </button>
          <button type="button" className="btn btn-primary" onClick={() => submit("Published")} disabled={!!saving}>
            {saving === "Published" ? t("იგზავნება…", "Sending…") : t("გამოქვეყნება", "Publish")}
          </button>
        </div>
      </div>
    </div>
  );
}
