import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../api";
import { useAuth } from "../auth";
import { usePrefs } from "../i18n";

interface BillingStatus {
  planId: string;
  status: string;
  currentPeriodEnd?: string | null;
  isActive: boolean;
  stripeConfigured: boolean;
  fakeSubscribeAllowed: boolean;
  publishableKey?: string | null;
  centerProPriceGel: number;
  centerProInterval: string;
}

export default function CenterSubscription() {
  const { user } = useAuth();
  const { t } = usePrefs();
  const [params, setParams] = useSearchParams();
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  const isCenter = user?.role === "TrainingCenter";
  const success = params.get("success") === "1";
  const canceled = params.get("canceled") === "1";

  const load = async () => {
    if (!user) return;
    try {
      const r = await api.get<BillingStatus>("/billing/status");
      setStatus(r.data);
    } catch {
      setError(t("ვერ ჩაიტვირთა ბილინგის სტატუსი", "Could not load billing status"));
    }
  };

  useEffect(() => {
    void load();
  }, [user?.userId]);

  useEffect(() => {
    if (!success && !canceled) return;
    if (success) {
      setNote(t(
        "გადახდა წარმატებულია — განაახლეთ სტატუსი თუ ჯერ არ ჩანს.",
        "Payment succeeded — refresh if status is not active yet."
      ));
    }
    if (canceled) {
      setNote(t("Checkout გაუქმდა.", "Checkout was canceled."));
    }
    requestAnimationFrame(() => {
      document.getElementById("subscription")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    const next = new URLSearchParams(params);
    next.delete("success");
    next.delete("canceled");
    next.delete("session_id");
    setParams(next, { replace: true });
  }, [success, canceled]);

  const checkout = async () => {
    setBusy(true);
    setError("");
    try {
      const r = await api.post<{ url: string }>("/billing/checkout", { planId: "center_pro" });
      window.location.href = r.data.url;
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        t("Checkout ვერ დაიწყო", "Could not start checkout");
      setError(msg);
      setBusy(false);
    }
  };

  const fakeActivate = async () => {
    setBusy(true);
    setError("");
    try {
      const r = await api.post<BillingStatus>("/billing/fake-activate", { days: 30, planId: "center_pro" });
      setStatus(r.data);
      setNote(t("ტესტური გამოწერა გააქტიურდა 30 დღით.", "Test subscription activated for 30 days."));
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        t("ვერ გააქტიურდა", "Could not activate");
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    if (!confirm(t("გაუქმდეს Center Pro?", "Cancel Center Pro?"))) return;
    setBusy(true);
    setError("");
    try {
      const r = await api.post<BillingStatus>("/billing/cancel");
      setStatus(r.data);
      setNote(t("გამოწერა გაუქმებულია.", "Subscription canceled."));
    } catch {
      setError(t("გაუქმება ვერ მოხერხდა", "Cancel failed"));
    } finally {
      setBusy(false);
    }
  };

  const price = status?.centerProPriceGel ?? 29;
  const endLabel = status?.currentPeriodEnd
    ? new Date(status.currentPeriodEnd).toLocaleDateString()
    : null;

  return (
    <div id="subscription" className="card" style={{ padding: 20 }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        gap: 12,
        flexWrap: "wrap",
        marginBottom: 8,
      }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", margin: 0 }}>
          {t("გამოწერა", "Subscription")} — MedTer Pro
        </h3>
        <div style={{ fontSize: 20, fontWeight: 800, color: "var(--brand)" }}>
          {price} ₾
          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--muted)" }}>
            {" "}/ {t("თვე", "mo")}
          </span>
        </div>
      </div>
      <p style={{ fontSize: 13.5, color: "var(--muted)", margin: "0 0 14px", lineHeight: 1.5 }}>
        {t(
          "გამოქვეყნება საჭიროებს გამოწერას. Draft უფასოა.",
          "Publishing requires a subscription. Drafts stay free."
        )}
      </p>

      {note && (
        <div style={{
          padding: "10px 12px",
          marginBottom: 12,
          borderRadius: 10,
          background: "var(--teal-soft)",
          color: "var(--text)",
          fontSize: 13.5,
        }}>
          {note}
        </div>
      )}
      {error && <div className="auth-error" style={{ marginBottom: 12 }}>{error}</div>}

      <ul style={{
        margin: "0 0 16px",
        paddingLeft: 18,
        color: "var(--text-body)",
        lineHeight: 1.65,
        fontSize: 13.5,
      }}>
        <li>{t("განცხადებების გამოქვეყნება", "Publish training announcements")}</li>
        <li>{t("დაინტერესებული ექიმები და ჩატი", "Interested doctors & chat")}</li>
        <li>{t("სერტიფიკატების გაცემა", "Issue certificates")}</li>
      </ul>

      {!user && (
        <p style={{ fontSize: 13.5, color: "var(--muted)", margin: 0 }}>
          {t(
            "შესასვლელად გამოიყენეთ ტრენინგ ცენტრის ანგარიში.",
            "Sign in with a training center account to subscribe."
          )}
          {" "}
          <Link to="/register" style={{ color: "var(--brand)" }}>
            {t("რეგისტრაცია", "Register")}
          </Link>
        </p>
      )}

      {user && !isCenter && (
        <p style={{ fontSize: 13.5, color: "var(--muted)", margin: 0 }}>
          {t("ეს გეგმა მხოლოდ ტრენინგ ცენტრებისთვისაა.", "This plan is only for training centers.")}
        </p>
      )}

      {user && isCenter && status && (
        <>
          <p style={{ fontSize: 13.5, marginBottom: 14, color: "var(--text-body)" }}>
            {t("სტატუსი", "Status")}:{" "}
            <b style={{ color: status.isActive ? "var(--teal)" : "var(--muted)" }}>
              {status.isActive ? t("აქტიური", "Active") : status.status}
            </b>
            {endLabel && status.isActive && (
              <> · {t("ვადა", "Until")} {endLabel}</>
            )}
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {!status.isActive && status.stripeConfigured && (
              <button className="btn btn-primary btn-sm" type="button" disabled={busy} onClick={checkout}>
                {busy ? "…" : t("Stripe Checkout (ტესტი)", "Stripe Checkout (test)")}
              </button>
            )}
            {!status.isActive && status.fakeSubscribeAllowed && (
              <button className="btn btn-ghost btn-sm" type="button" disabled={busy} onClick={fakeActivate}>
                {busy ? "…" : t("ტესტური აქტივაცია (ბარათის გარეშე)", "Test activate (no card)")}
              </button>
            )}
            {status.isActive && (
              <button className="btn btn-ghost btn-sm" type="button" disabled={busy} onClick={cancel}>
                {t("გაუქმება", "Cancel")}
              </button>
            )}
            <button className="btn btn-text btn-sm" type="button" disabled={busy} onClick={() => void load()}>
              {t("განახლება", "Refresh")}
            </button>
          </div>

          {!status.stripeConfigured && status.fakeSubscribeAllowed && (
            <p style={{ marginTop: 12, marginBottom: 0, fontSize: 12, color: "var(--soft)", lineHeight: 1.5 }}>
              {t(
                "Stripe გასაღებები არ არის — გამოიყენეთ ტესტური აქტივაცია.",
                "No Stripe keys — use test activate."
              )}
            </p>
          )}
        </>
      )}
    </div>
  );
}
