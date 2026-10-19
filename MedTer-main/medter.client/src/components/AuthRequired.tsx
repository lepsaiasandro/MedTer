import { Link } from "react-router-dom";
import { usePrefs } from "../i18n";
import { Cap } from "./icons";

type AuthRequiredProps = {
  titleKa?: string;
  titleEn?: string;
  textKa?: string;
  textEn?: string;
};

export default function AuthRequired({
  titleKa = "ტრენინგების ფიდის სანახავად ანგარიში გჭირდება",
  titleEn = "You need an account to view the trainings feed",
  textKa = "შექმენი ანგარიში ან შედი — შემდეგ დაინახავ ყველა ტრენინგს Facebook Events-ის მსგავს ფიდში.",
  textEn = "Create an account or sign in — then you'll see all trainings in a Facebook Events-style feed.",
}: AuthRequiredProps) {
  const { t } = usePrefs();

  return (
    <div className="auth-required">
      <div className="auth-required-card">
        <span className="auth-required-icon" aria-hidden="true">
          <Cap size={28} />
        </span>
        <h1>{t(titleKa, titleEn)}</h1>
        <p>{t(textKa, textEn)}</p>
        <div className="auth-required-actions">
          <Link to="/register" className="btn btn-primary">
            {t("ანგარიშის შექმნა", "Create account")}
          </Link>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => window.dispatchEvent(new Event("medter:open-login"))}
          >
            {t("შესვლა", "Sign in")}
          </button>
        </div>
      </div>
    </div>
  );
}
