import { useNavigate } from "react-router-dom";
import { usePrefs } from "../i18n";
import { Cap, Check, Stethoscope } from "../components/icons";

export default function About() {
  const { t } = usePrefs();
  const navigate = useNavigate();

  return (
    <div className="landing about-page">
      <section className="landing-section landing-audience" id="audience">
        <div className="landing-audience-head">
          <h1 className="section-title">{t("ჩვენს შესახებ", "About us")}</h1>
          <p className="landing-section-sub">
            {t(
              "MedTer აერთიანებს ექიმებს და ტრენინგ ცენტრებს — ტრენინგები, უპგ ქულები და სერტიფიკატები ერთ სივრცეში.",
              "MedTer brings doctors and training centers together — trainings, CPD points and certificates in one place."
            )}
          </p>
        </div>

        <div className="landing-roles">
          <div className="landing-role reveal">
            <span className="landing-role-icon" aria-hidden="true">
              <Stethoscope size={20} />
            </span>
            <h3>{t("ექიმებისთვის", "For doctors")}</h3>
            <p className="landing-role-desc">
              {t(
                "იპოვე ტრენინგები შენი სპეციალობის მიხედვით და დააგროვე უპგ ქულები.",
                "Find trainings by your specialty and earn CPD credits."
              )}
            </p>
            <ul className="checks">
              <li><Check size={16} /> {t("ცენტრების ძიება და შეფასება", "Search and rate centers")}</li>
              <li><Check size={16} /> {t("ტრენინგებზე დარეგისტრირება", "Register for trainings")}</li>
              <li><Check size={16} /> {t("სერტიფიკატების მართვა ერთ ადგილას", "Manage certificates in one place")}</li>
            </ul>
            <button
              type="button"
              className="btn btn-ghost landing-role-cta"
              onClick={() => navigate("/register?role=doctor")}
            >
              {t("ექიმის რეგისტრაცია", "Doctor registration")}
            </button>
          </div>

          <div className="landing-role reveal" style={{ animationDelay: "80ms" }}>
            <span className="landing-role-icon" aria-hidden="true">
              <Cap size={20} />
            </span>
            <h3>{t("ტრენინგ ცენტრებისთვის", "For training centers")}</h3>
            <p className="landing-role-desc">
              {t(
                "მოიზიდე ექიმები, მართე კურსები და გაზარდე შენი აუდიტორია.",
                "Attract doctors, manage courses, and grow your audience."
              )}
            </p>
            <ul className="checks">
              <li><Check size={16} /> {t("კონფერენციებისა და ტრენინგების გამოქვეყნება", "Publish conferences and trainings")}</li>
              <li><Check size={16} /> {t("მონაწილეების მართვა", "Manage participants")}</li>
              <li><Check size={16} /> {t("ვერიფიკაცია და ნდობა", "Verification and trust")}</li>
            </ul>
            <button
              type="button"
              className="btn btn-ghost landing-role-cta"
              onClick={() => navigate("/register?role=center")}
            >
              {t("ცენტრის რეგისტრაცია", "Center registration")}
            </button>
          </div>
        </div>
      </section>

      <section className="landing-section landing-banner" id="contact">
        <div className="landing-banner-inner reveal">
          <h2>{t("კონტაქტი", "Contact")}</h2>
          <p>
            {t(
              "შექმენი ანგარიში რამდენიმე წუთში და დაიწყე სწავლა ქართულ სამედიცინო საზოგადოებასთან ერთად.",
              "Create an account in a few minutes and start learning with the Georgian medical community."
            )}
          </p>
          <div className="landing-banner-cta">
            <button className="btn btn-primary btn-lg" onClick={() => navigate("/register")}>
              {t("რეგისტრაცია", "Register")}
            </button>
            <button
              className="btn btn-ghost btn-lg"
              onClick={() => window.dispatchEvent(new Event("medter:open-login"))}
            >
              {t("შესვლა", "Sign in")}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
