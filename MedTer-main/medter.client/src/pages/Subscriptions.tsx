import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../api";
import { useAuth } from "../auth";
import { Cap, Check, Stethoscope } from "../components/icons";
import { usePrefs } from "../i18n";

interface BillingPlan {
  planId: string;
  audience: "doctor" | "center";
  priceGel: number;
  interval: string;
  stripeConfigured: boolean;
}

interface BillingPlans {
  plans: BillingPlan[];
  fakeSubscribeAllowed: boolean;
}

interface BillingStatus {
  planId: string;
  status: string;
  currentPeriodEnd?: string | null;
  isActive: boolean;
  stripeConfigured: boolean;
  fakeSubscribeAllowed: boolean;
  audience: "doctor" | "center" | "none";
}

const FALLBACK: BillingPlan[] = [
  { planId: "doctor_pro", audience: "doctor", priceGel: 15, interval: "month", stripeConfigured: false },
  { planId: "center_pro", audience: "center", priceGel: 29, interval: "month", stripeConfigured: false },
];

export default function Subscriptions() {
  const { user } = useAuth();
  const { t } = usePrefs();
  const [params, setParams] = useSearchParams();
  const [plans, setPlans] = useState<BillingPlan[]>(FALLBACK);
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [fakeAllowed, setFakeAllowed] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  const success = params.get("success") === "1";
  const canceled = params.get("canceled") === "1";

  const load = async () => {
    try {
      const plansRes = await api.get<BillingPlans>("/billing/plans");
      if (plansRes.data.plans?.length) setPlans(plansRes.data.plans);
      setFakeAllowed(plansRes.data.fakeSubscribeAllowed);
    } catch {
      setPlans(FALLBACK);
    }
    if (!user) {
      setStatus(null);
      return;
    }
    try {
      const statusRes = await api.get<BillingStatus>("/billing/status");
      setStatus(statusRes.data);
      setFakeAllowed(statusRes.data.fakeSubscribeAllowed);
    } catch {
      setError(t("ვერ ჩაიტვირთა გამოწერის სტატუსი", "Could not load subscription status"));
    }
  };

  useEffect(() => {
    void load();
  }, [user?.userId]);

  useEffect(() => {
    if (!success && !canceled) return;
    if (success) {
      setNote(t(
        "გადახდა წარმატებულია. თუ სტატუსი ჯერ არ ჩანს, განაახლე გვერდი.",
        "Payment succeeded. Refresh if the status is not active yet."
      ));
    }
    if (canceled) setNote(t("გადახდა გაუქმდა.", "Checkout was canceled."));
    const next = new URLSearchParams(params);
    next.delete("success");
    next.delete("canceled");
    next.delete("session_id");
    setParams(next, { replace: true });
  }, [success, canceled]);

  const checkout = async (planId: string) => {
    setBusyId(planId);
    setError("");
    try {
      const r = await api.post<{ url: string }>("/billing/checkout", { planId });
      window.location.href = r.data.url;
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        t("გადახდა ვერ დაიწყო", "Could not start checkout");
      setError(msg);
      setBusyId(null);
    }
  };

  const fakeActivate = async (planId: string) => {
    setBusyId(planId);
    setError("");
    try {
      const r = await api.post<BillingStatus>("/billing/fake-activate", { days: 30, planId });
      setStatus(r.data);
      setNote(t("ტესტური გამოწერა გააქტიურდა 30 დღით.", "Test subscription activated for 30 days."));
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        t("ვერ გააქტიურდა", "Could not activate");
      setError(msg);
    } finally {
      setBusyId(null);
    }
  };

  const cancel = async () => {
    if (!confirm(t("გაუქმდეს MedTer Pro?", "Cancel MedTer Pro?"))) return;
    setBusyId("cancel");
    setError("");
    try {
      const r = await api.post<BillingStatus>("/billing/cancel");
      setStatus(r.data);
      setNote(t("გამოწერა გაუქმებულია.", "Subscription canceled."));
    } catch {
      setError(t("გაუქმება ვერ მოხერხდა", "Cancel failed"));
    } finally {
      setBusyId(null);
    }
  };

  const askLogin = () => window.dispatchEvent(new Event("medter:open-login"));

  const endLabel = status?.currentPeriodEnd
    ? new Date(status.currentPeriodEnd).toLocaleDateString()
    : null;

  const copy = {
    doctor: {
      title: t("ექიმებისთვის", "For doctors"),
      text: t(
        "ტრენინგებზე რეგისტრაცია, უპგ ქულები და სერტიფიკატები ერთ გამოწერაში.",
        "Training registration, CPD points and certificates in one subscription."
      ),
      features: [
        t("ტრენინგებზე რეგისტრაცია და შეხსენებები", "Training registration and reminders"),
        t("უპგ ქულებისა და სერტიფიკატების არქივი", "CPD points and certificate archive"),
        t("პირდაპირი ჩატი ტრენინგ ცენტრებთან", "Direct chat with training centers"),
        t("შენახული ტრენინგები", "Saved trainings"),
      ],
      register: "/register?role=doctor",
    },
    center: {
      title: t("ტრენინგ ცენტრებისთვის", "For training centers"),
      text: t(
        "გამოქვეყნება საჭიროებს MedTer Pro-ს. მონახაზები უფასო რჩება.",
        "Publishing requires MedTer Pro. Drafts stay free."
      ),
      features: [
        t("ტრენინგების გამოქვეყნება", "Publish trainings"),
        t("დაინტერესებული ექიმები და ჩატი", "Interested doctors and chat"),
        t("სერტიფიკატების გაცემა", "Issue certificates"),
        t("მონაწილეების მართვა", "Manage participants"),
      ],
      register: "/register?role=center",
    },
  };

  return (
    <div className="plans-page">
      <header className="plans-head">
        <span className="plans-kicker">MedTer Pro</span>
        <h1>{t("გამოწერები", "Subscriptions")}</h1>
        <p>
          {t(
            "ექიმებისთვის და ტრენინგ ცენტრებისთვის ცალკე გეგმებია. აირჩიე შენი როლი.",
            "Doctors and training centers have separate plans. Choose yours."
          )}
        </p>
      </header>

      {note && <div className="plans-note">{note}</div>}
      {error && <div className="auth-error plans-error">{error}</div>}

      {status?.isActive && (
        <p className="plans-status">
          {t("შენი გამოწერა აქტიურია", "Your subscription is active")}
          {endLabel ? ` · ${t("ვადა", "Until")} ${endLabel}` : ""}
        </p>
      )}

      <div className="plans-grid">
        {plans.map((plan) => {
          const kind = plan.audience === "center" ? "center" : "doctor";
          const info = copy[kind];
          const mine = status?.audience === plan.audience;
          const active = Boolean(mine && status?.isActive);
          const canBuy = Boolean(user && mine);
          const stripeOn = mine ? Boolean(status?.stripeConfigured) : plan.stripeConfigured;
          return (
            <article key={plan.planId} className={`plan-card${active ? " is-active" : ""}`}>
              <span className="plan-icon" aria-hidden="true">
                {kind === "doctor" ? <Stethoscope size={20} /> : <Cap size={20} />}
              </span>
              <div className="plan-brand">MedTer Pro</div>
              <h2>{info.title}</h2>
              <div className="plan-price">
                {plan.priceGel} ₾
                <span> / {t("თვე", "mo")}</span>
              </div>
              <p>{info.text}</p>
              <ul>
                {info.features.map((feature) => (
                  <li key={feature}><Check size={15} /> {feature}</li>
                ))}
              </ul>

              {active && (
                <p className="plan-state">{t("აქტიური გამოწერა", "Active subscription")}</p>
              )}

              <div className="plan-actions">
                {!user && (
                  <>
                    <button type="button" className="btn btn-primary" onClick={askLogin}>
                      {t("შესვლა და გამოწერა", "Sign in to subscribe")}
                    </button>
                    <Link className="btn btn-ghost" to={info.register}>
                      {t("რეგისტრაცია", "Register")}
                    </Link>
                  </>
                )}

                {user && !mine && user.role !== "Admin" && (
                  <p className="plan-locked">
                    {kind === "doctor"
                      ? t("ეს გეგმა მხოლოდ ექიმებისთვისაა.", "This plan is only for doctors.")
                      : t("ეს გეგმა მხოლოდ ტრენინგ ცენტრებისთვისაა.", "This plan is only for training centers.")}
                  </p>
                )}

                {user?.role === "Admin" && (
                  <p className="plan-locked">
                    {t("ადმინის ანგარიშს გამოწერა არ სჭირდება.", "Admin accounts do not need a subscription.")}
                  </p>
                )}

                {canBuy && !active && stripeOn && (
                  <button type="button" className="btn btn-primary" disabled={busyId === plan.planId} onClick={() => void checkout(plan.planId)}>
                    {busyId === plan.planId ? "…" : t("გამოწერა", "Subscribe")}
                  </button>
                )}
                {canBuy && !active && fakeAllowed && (
                  <button type="button" className="btn btn-ghost" disabled={busyId === plan.planId} onClick={() => void fakeActivate(plan.planId)}>
                    {busyId === plan.planId ? "…" : t("ტესტური აქტივაცია", "Test activate")}
                  </button>
                )}
                {canBuy && active && (
                  <button type="button" className="btn btn-ghost" disabled={busyId === "cancel"} onClick={() => void cancel()}>
                    {t("გაუქმება", "Cancel")}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
