import { usePrefs } from "../i18n";
import { partnerLogoUrl } from "../partnerLogos";
import type { PartnerCreative } from "./LinearAdBanner";
import { ExternalLink } from "./icons";

/** Facebook-style Sponsored card for the Events feed. */
export default function SponsoredEventCard({ item }: { item: PartnerCreative }) {
  const { t } = usePrefs();
  const external = /^https?:\/\//i.test(item.href);
  const logo = partnerLogoUrl(item.brand);

  return (
    <a
      href={item.href}
      className="fb-sponsored"
      {...(external ? { target: "_blank", rel: "noopener noreferrer sponsored" } : {})}
      style={{
        ["--sp-accent" as string]: item.accent,
        ["--sp-accent2" as string]: item.accent2,
      }}
    >
      <div className="fb-sponsored-cover" aria-hidden="true">
        <div className={`fb-sponsored-mark${logo ? " has-logo" : ""}`}>
          {logo ? <img src={logo} alt="" /> : item.brand.slice(0, 2).toUpperCase()}
        </div>
      </div>
      <div className="fb-sponsored-body">
        <div className="fb-sponsored-label">
          {t("სპონსორირებული", "Sponsored")}
          <span className="fb-sponsored-dot">·</span>
          <span>{item.brand}</span>
        </div>
        <h3 className="fb-sponsored-title">{t(item.titleKa, item.titleEn)}</h3>
        <p className="fb-sponsored-text">{t(item.textKa, item.textEn)}</p>
        <span className="fb-sponsored-cta">
          {t(item.ctaKa, item.ctaEn)}
          {external && <ExternalLink size={14} />}
        </span>
      </div>
    </a>
  );
}
