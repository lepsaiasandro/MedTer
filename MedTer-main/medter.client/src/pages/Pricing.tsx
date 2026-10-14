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

export default function Pricing() {
  const { user } = useAuth();
  const { t } = usePrefs();
  const [params] = useSearchParams();
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
    load();
  }, [user?.userId]);

  useEffect(() => {
    if (success) setNote(t("გადახდა წარმატებულია — განაახლეთ სტატუსი თუ ჯერ არ ჩანს.", "Payment succeeded — refresh if status is not active yet."));
    if (canceled) setNote(t("Checkout გაუქმდა.", "Checkout was canceled."));
  }, [success, canceled]);

  const checkout = async () => {
    setBusy(true);
    setError("");
    try {
      const r = await api.post<{ url: string }>("/billing/checkout");
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
      const r = await api.post<BillingStatus>("/billing/fake-activate", { days: 30 });
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
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 16px 64px" }}>
      <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 8 }}>
        <Link to="/" style={{ color: "var(--brand)" }}>{t("მთავარი", "Home")}</Link>
        {" / "}
        {t("გამოწერა", "Pricing")}
      </p>
      <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--text)", marginBottom: 8 }}>
        {t("Center Pro", "Center Pro")}
      </h1>
      <p style={{ color: "var(--muted)", marginBottom: 28, lineHeight: 1.5 }}>
        {t(
          "ტრენინგ ცენტრებისთვის — გამოაქვეყნეთ განცხადებები. Draft უფასოა; გამოქვეყნება საჭიროებს გამოწერას.",
          "For training centers — publish trainings. Drafts are free; publishing requires a subscription."
        )}
      </p>

      {note && (
        <div style={{
          padding: "12px 14px", marginBottom: 16, borderRadius: 10,
          background: "var(--teal-soft)", color: "var(--text)", fontSize: 14
        }}>{note}</div>
      )}
      {error && (
        <div style={{
          padding: "12px 14px", marginBottom: 16, borderRadius: 10,
          background: "rgba(220,60,60,.12)", color: "var(--text)", fontSize: 14
        }}>{error}</div>
      )}

      <div style={{
        border: "1px solid var(--border)", borderRadius: 16, padding: 24,
        background: "var(--card, var(--bg))",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)" }}>Center Pro</h2>
          <div style={{ fontSize: 28, fontWeight: 800, color: "var(--brand)" }}>
            {price} ₾
            <span style={{ fontSize: 14, fontWeight: 500, color: "var(--muted)" }}>
              {" "}/ {t("თვე", "mo")}
            </span>
          </div>
        </div>
        <ul style={{ margin: "16px 0 24px", paddingLeft: 18, color: "var(--text-body)", lineHeight: 1.7, fontSize: 14 }}>
          <li>{t("განცხადებების გამოქვეყნება", "Publish training announcements")}</li>
          <li>{t("დაინტერესებული ექიმები და ჩატი", "Interested doctors & chat")}</li>
          <li>{t("სერტიფიკატების გაცემა", "Issue certificates")}</li>
          <li>{t("Draft შენახვა ყოველთვის უფასოა", "Saving drafts stays free")}</li>
        </ul>

        {!user && (
          <p style={{ fontSize: 14, color: "var(--muted)" }}>
            {t("შესასვლელად გამოიყენეთ ტრენინგ ცენტრის ანგარიში.", "Sign in with a training center account to subscribe.")}
            {" "}
            <Link to="/register" style={{ color: "var(--brand)" }}>{t("რეგისტრაცია", "Register")}</Link>
          </p>
        )}

        {user && !isCenter && (
          <p style={{ fontSize: 14, color: "var(--muted)" }}>
            {t("ეს გეგმა მხოლოდ ტრენინგ ცენტრებისთვისაა.", "This plan is only for training centers.")}
          </p>
        )}

        {user && isCenter && status && (
          <>
            <p style={{ fontSize: 14, marginBottom: 16, color: "var(--text-body)" }}>
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
                <button className="btn primary" disabled={busy} onClick={checkout}>
                  {busy ? "…" : t("Stripe Checkout (ტესტი)", "Stripe Checkout (test)")}
                </button>
              )}
              {!status.isActive && status.fakeSubscribeAllowed && (
                <button className="btn" disabled={busy} onClick={fakeActivate}
                  style={{ border: "1px solid var(--border)", background: "transparent", color: "var(--text)" }}>
                  {busy ? "…" : t("ტესტური აქტივაცია (ბარათის გარეშე)", "Test activate (no card)")}
                </button>
              )}
              {status.isActive && (
                <button className="btn" disabled={busy} onClick={cancel}
                  style={{ border: "1px solid var(--border)", background: "transparent", color: "var(--text)" }}>
                  {t("გაუქმება", "Cancel")}
                </button>
              )}
              <button className="btn" disabled={busy} onClick={load}
                style={{ border: "1px solid var(--border)", background: "transparent", color: "var(--muted)" }}>
                {t("განახლება", "Refresh")}
              </button>
            </div>

            {!status.stripeConfigured && status.fakeSubscribeAllowed && (
              <p style={{ marginTop: 14, fontSize: 12, color: "var(--soft)", lineHeight: 1.5 }}>
                {t(
                  "Stripe გასაღებები არ არის — გამოიყენეთ ტესტური აქტივაცია. რეალური Checkout-ისთვის დაამატეთ Stripe:SecretKey და CenterProPriceId.",
                  "No Stripe keys — use test activate. For real Checkout, set Stripe:SecretKey and CenterProPriceId."
                )}
              </p>
            )}
          </>
        )}
      </div>

      <p style={{ marginTop: 20, fontSize: 12, color: "var(--soft)", lineHeight: 1.5 }}>
        {t(
          "Stripe ტესტ ბარათი: 4242 4242 4242 4242, ნებისმიერი მომავალი თარიღი, ნებისმიერი CVC.",
          "Stripe test card: 4242 4242 4242 4242, any future expiry, any CVC."
        )}
      </p>
    </div>
  );
}
