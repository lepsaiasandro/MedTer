import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import api from "../api";
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

export type BannerPlacement = "default" | "trainings" | "centers";

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
  {
    id: "gpc",
    href: "https://www.gpc.ge/",
    brand: "GPC",
    titleKa: "GPC — ჯანდაცვის პროდუქტები",
    titleEn: "GPC — healthcare products",
    textKa: "აფთიაქების ქსელი და ონლაინ შეკვეთა მთელი ქვეყნის მასშტაბით.",
    textEn: "Pharmacy network and online ordering nationwide.",
    ctaKa: "gpc.ge",
    ctaEn: "gpc.ge",
    accent: "#0f766e",
    accent2: "#115e59",
  },
];

const PLACEMENT_EXTRAS: Record<"trainings" | "centers", PartnerCreative[]> = {
  trainings: [
    {
      id: "medter-trainings",
      href: "/announcements",
      brand: "MedTer",
      titleKa: "იპოვე ტრენინგი MedTer-ზე",
      titleEn: "Find a training on MedTer",
      textKa: "უპგ ქულები, სერტიფიკატები და რეგისტრაცია — ერთ სივრცეში.",
      textEn: "CPD points, certificates and registration — in one place.",
      ctaKa: "ნახე ტრენინგები",
      ctaEn: "Browse trainings",
      accent: "#0b3d5c",
      accent2: "#0f766e",
    },
    {
      id: "medter-cpd",
      href: "/announcements?mine=1",
      brand: "MedTer",
      titleKa: "შენი უპგ ქულები ერთ ადგილას",
      titleEn: "Your CPD points in one place",
      textKa: "დარეგისტრირდი ტრენინგზე და თვალი ადევნე პროგრესს.",
      textEn: "Register for trainings and track your progress.",
      ctaKa: "ჩემი ტრენინგები",
      ctaEn: "My trainings",
      accent: "#1d4ed8",
      accent2: "#0e7490",
    },
  ],
  centers: [
    {
      id: "medter-centers",
      href: "/announcements",
      brand: "MedTer",
      titleKa: "ტრენინგ ცენტრები MedTer-ზე",
      titleEn: "Training centers on MedTer",
      textKa: "გაეცანი ვერიფიცირებულ ცენტრებს და მათ პროგრამებს.",
      textEn: "Discover verified centers and their programs.",
      ctaKa: "ცენტრების ნახვა",
      ctaEn: "Browse centers",
      accent: "#134e4a",
      accent2: "#0f766e",
    },
    {
      id: "medter-center-join",
      href: "/register?role=center",
      brand: "MedTer",
      titleKa: "გამოაქვეყნე ტრენინგები ცენტრად",
      titleEn: "Publish trainings as a center",
      textKa: "მიაღწიე ქართველ ექიმებს და გაზარდე რეგისტრაციები.",
      textEn: "Reach Georgian doctors and grow registrations.",
      ctaKa: "შემოგვიერთდი",
      ctaEn: "Join us",
      accent: "#7c2d12",
      accent2: "#b45309",
    },
  ],
};

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

function shuffle<T>(list: T[]): T[] {
  const next = [...list];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function buildPool(apiItems: PartnerCreative[], placement: BannerPlacement, random: boolean): PartnerCreative[] {
  const extras = placement === "trainings" || placement === "centers" ? PLACEMENT_EXTRAS[placement] : [];
  const base = apiItems.length > 0 ? apiItems : FALLBACK;
  const merged = [...extras, ...base];
  // de-dupe by id
  const seen = new Set<string | number>();
  const unique = merged.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
  return random ? shuffle(unique) : unique;
}

/** Active partner creatives for feed injection (Sponsored cards). */
export function useSponsoredCreatives(placement: BannerPlacement = "trainings") {
  const [items, setItems] = useState<PartnerCreative[]>(() => buildPool([], placement, true));

  useEffect(() => {
    let cancelled = false;
    api.get<AdBannerApi[]>("/ads")
      .then((r) => {
        if (cancelled) return;
        setItems(buildPool((r.data || []).map(mapApi), placement, true));
      })
      .catch(() => {
        if (cancelled) return;
        setItems(buildPool([], placement, true));
      });
    return () => { cancelled = true; };
  }, [placement]);

  return items;
}

/** Full-width partner banner under the top nav.
 *  Use `embedded` + `random` + `placement` on trainings/centers pages. */
export default function LinearAdBanner({
  embedded = false,
  random = false,
  placement = "default",
  compact = false,
}: {
  embedded?: boolean;
  random?: boolean;
  placement?: BannerPlacement;
  compact?: boolean;
}) {
  const { t } = usePrefs();
  const { pathname } = useLocation();
  const [items, setItems] = useState<PartnerCreative[]>(() => buildPool([], placement, random));
  const [index, setIndex] = useState(() => (random && items.length ? Math.floor(Math.random() * items.length) : 0));

  const pageHasOwnBanner = pathname === "/announcements" || pathname === "/centers";
  const hideInLayout = !embedded && pageHasOwnBanner;

  useEffect(() => {
    let cancelled = false;
    api.get<AdBannerApi[]>("/ads")
      .then((r) => {
        if (cancelled) return;
        const apiItems = (r.data || []).map(mapApi);
        const list = buildPool(apiItems, placement, random);
        setItems(list);
        setIndex(random && list.length ? Math.floor(Math.random() * list.length) : 0);
      })
      .catch(() => {
        if (cancelled) return;
        const list = buildPool([], placement, random);
        setItems(list);
        setIndex(random && list.length ? Math.floor(Math.random() * list.length) : 0);
      });
    return () => { cancelled = true; };
  }, [random, placement]);

  useEffect(() => {
    if (items.length <= 1) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % items.length), 6500);
    return () => clearInterval(timer);
  }, [items.length]);

  if (hideInLayout || items.length === 0) return null;

  const item = items[Math.min(index, items.length - 1)];
  const external = /^https?:\/\//i.test(item.href);
  const logo = partnerLogoUrl(item.brand);

  return (
    <aside className={`partner-strip${embedded ? " partner-strip--embedded" : ""}${compact ? " partner-strip--compact" : ""}`} aria-label={t("სპონსორირებული", "Sponsored")}>
      <div className="partner-strip-inner">
        <span className="partner-strip-label">{t("სპონსორირებული", "Sponsored")}</span>
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
              item.brand.slice(0, 2).toUpperCase()
            )}
          </div>
          <div className="partner-strip-copy">
            <strong>{t(item.titleKa, item.titleEn)}</strong>
            <span>{t(item.textKa, item.textEn)}</span>
          </div>
          <span className="partner-strip-cta">{t(item.ctaKa, item.ctaEn)}</span>
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
