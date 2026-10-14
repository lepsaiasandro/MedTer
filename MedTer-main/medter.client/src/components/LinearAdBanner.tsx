import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import api from "../api";
import { useAuth } from "../auth";
import { usePrefs } from "../i18n";
import { partnerLogoUrl } from "../partnerLogos";

export interface PartnerCreative {
  id: number | string;
  href: string;
  brand: string;
  titleKa: string;
  titleEn: string;
  textKa: string;
  textEn: string;
  ctaKa: string;
  ctaEn: string;
  accent: string;
  accent2: string;
}

interface AdBannerApi {
  id: number;
  brand: string;
  href: string;
  titleKa: string;
  titleEn: string;
  textKa: string;
  textEn: string;
  ctaKa: string;
  ctaEn: string;
  accent: string;
  accent2: string;
  sortOrder: number;
  isActive: boolean;
}

const FALLBACK: PartnerCreative[] = [
  {
    id: "psp",
    href: "https://psp.ge/",
    brand: "PSP",
    titleKa: "PSP — ონლაინ აფთიაქი",
    titleEn: "PSP — online pharmacy",
    textKa: "45,000+ პროდუქტი, სწრაფი მიწოდება და გარანტირებული ხარისხი.",
    textEn: "45,000+ products, fast delivery and guaranteed quality.",
    ctaKa: "psp.ge",
    ctaEn: "psp.ge",
    accent: "#1e4d8c",
    accent2: "#0f2d5c",
  },
  {
    id: "aversi",
    href: "https://www.aversi.ge/",
    brand: "Aversi",
    titleKa: "ავერსი — აფთიაქები მთელ საქართველოში",
    titleEn: "Aversi — pharmacies across Georgia",
    textKa: "აფთიაქები, ონლაინ შეკვეთა და მტრედი ბარათის შეთავაზებები.",
    textEn: "Pharmacies, online ordering and Mtredi card offers.",
    ctaKa: "aversi.ge",
    ctaEn: "aversi.ge",
    accent: "#c8102e",
    accent2: "#8b0a1e",
  },
];

function mapApi(a: AdBannerApi): PartnerCreative {
  return {
    id: a.id,
    brand: a.brand,
    href: a.href,
    titleKa: a.titleKa,
    titleEn: a.titleEn,
    textKa: a.textKa,
    textEn: a.textEn,
    ctaKa: a.ctaKa,
    ctaEn: a.ctaEn,
    accent: a.accent || "#2563eb",
    accent2: a.accent2 || "#1e40af",
  };
}

/** Full-width partner banner. Under the top bar for signed-in/other pages;
 *  on guest home use `embedded` inside Landing (above top centers). */
export default function LinearAdBanner({ embedded = false }: { embedded?: boolean }) {
  const { t } = usePrefs();
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [items, setItems] = useState<PartnerCreative[]>(FALLBACK);
  const [index, setIndex] = useState(0);
  // Layout instance stays hidden on guest `/` so Landing can place it above top centers.
  const hideInLayout = !embedded && !user && pathname === "/";

  useEffect(() => {
    let cancelled = false;
    api.get<AdBannerApi[]>("/ads")
      .then((r) => {
        if (cancelled) return;
        const next = (r.data || []).map(mapApi);
        if (next.length > 0) {
          setItems(next);
          setIndex(0);
        }
      })
      .catch(() => { /* keep fallback */ });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (items.length <= 1) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % items.length), 7000);
    return () => clearInterval(timer);
  }, [items.length]);

  if (hideInLayout || items.length === 0) return null;

  const item = items[Math.min(index, items.length - 1)];
  const external = /^https?:\/\//i.test(item.href);
  const logo = partnerLogoUrl(item.brand);

  return (
    <aside className="partner-strip" aria-label={t("პარტნიორი", "Partner")}>
      <div className="partner-strip-inner">
        <span className="partner-strip-label">{t("პარტნიორი", "Partner")}</span>
        <a
          href={item.href}
          className="partner-strip-card"
          {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          style={{
            background: `linear-gradient(105deg, ${item.accent} 0%, ${item.accent2} 100%)`,
          }}
        >
          <div className={`partner-strip-mark${logo ? " has-logo" : ""}`} aria-hidden="true">
            {logo ? (
              <img src={logo} alt="" className="partner-strip-logo" />
            ) : (
              item.brand
            )}
          </div>
          <div className="partner-strip-copy">
            <strong>{t(item.titleKa, item.titleEn)}</strong>
            <span>{t(item.textKa, item.textEn)}</span>
          </div>
          <span className="partner-strip-cta">{item.ctaKa || item.ctaEn}</span>
        </a>
        {items.length > 1 && (
          <div className="partner-strip-dots" role="tablist" aria-label={t("პარტნიორები", "Partners")}>
            {items.map((p, i) => (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={i === index}
                className={i === index ? "on" : ""}
                onClick={() => setIndex(i)}
                aria-label={p.brand}
              />
            ))}
            <span className="partner-strip-count" aria-hidden="true">
              {index + 1}/{items.length}
            </span>
          </div>
        )}
      </div>
    </aside>
  );
}
