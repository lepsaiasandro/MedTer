import { useEffect, useState } from "react";
import api from "../api";
import { useAuth } from "../auth";
import { usePrefs } from "../i18n";
import { Trophy } from "./icons";

interface Certificate { id: number; title: string; points: number; issuedAt: string; }
interface LeaderRow { doctorUserId: string; displayName: string; totalPoints: number; certificates: number; }

const GOAL = 50; // annual CPD goal (frontend constant)

export default function PointsPanel() {
  const { user } = useAuth();
  const { t } = usePrefs();
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [board, setBoard] = useState<LeaderRow[]>([]);

  useEffect(() => {
    api.get<Certificate[]>("/certificates/mine").then((r) => setCerts(r.data)).catch(() => {});
    api.get<LeaderRow[]>("/certificates/leaderboard").then((r) => setBoard(r.data)).catch(() => {});
  }, []);

  const points = certs.reduce((s, c) => s + c.points, 0);
  const pct = Math.min(100, Math.round((points / GOAL) * 100));
  const r = 52;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 16 }}>{t("ჩემი პროგრესი", "My Progress")}</h3>
        <div className="ring-wrap">
          <div className="ring">
            <svg width="150" height="150" viewBox="0 0 120 120" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="60" cy="60" r={r} fill="none" stroke="var(--border)" strokeWidth="10" />
              <circle cx="60" cy="60" r={r} fill="none" stroke="var(--teal)" strokeWidth="10" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} />
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
      </div>

      <div className="card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>{t("ბოლო სერტიფიკატები", "Recent Certificates")}</h3>
        {certs.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--soft)" }}>{t("ჯერ არ გაქვს სერტიფიკატი", "No certificates yet")}</p>
        ) : (
          certs.slice(0, 4).map((c) => (
            <div className="cert" key={c.id}>
              <span style={{ color: "var(--text-body)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</span>
              <span className="plus">+{c.points}</span>
            </div>
          ))
        )}
      </div>

      <div className="card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
          <Trophy size={18} /> {t("ლიდერბორდი", "Leaderboard")}
        </h3>
        {board.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--soft)" }}>{t("ცარიელია", "Empty")}</p>
        ) : (
          board.slice(0, 5).map((row, i) => {
            const me = row.doctorUserId === user?.userId;
            return (
              <div className="cert" key={row.doctorUserId} style={me ? { fontWeight: 700 } : undefined}>
                <span style={{ color: me ? "var(--brand)" : "var(--text-body)", display: "flex", gap: 8 }}>
                  <span style={{ color: "var(--soft)", width: 16 }}>{i + 1}.</span>{row.displayName}
                </span>
                <span className="plus">{row.totalPoints}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
