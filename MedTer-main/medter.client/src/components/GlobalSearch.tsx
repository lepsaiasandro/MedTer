import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { useAuth } from "../auth";
import { usePrefs } from "../i18n";
import { matchesSearch } from "../lib/search";
import { Cap, Pin, Search, Users, X } from "./icons";

interface AnnouncementHit {
  id: number;
  title: string;
  centerName: string;
  city?: string;
  category?: string;
  format?: string;
  shortDescription?: string;
  description?: string;
  type?: string;
  startDate?: string;
}

interface CenterHit {
  userId: string;
  name: string;
  description?: string;
  city?: string;
  phone?: string;
  categories?: string[];
}

type Hit =
  | { kind: "training"; item: AnnouncementHit }
  | { kind: "center"; item: CenterHit };

const MAX_PER_SECTION = 5;

export default function GlobalSearch() {
  const { user } = useAuth();
  const { t, lang } = usePrefs();
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [trainings, setTrainings] = useState<AnnouncementHit[]>([]);
  const [centers, setCenters] = useState<CenterHit[]>([]);
  const [loaded, setLoaded] = useState(false);

  const ensureData = async () => {
    if (loaded) return;
    try {
      const centersReq = api.get<CenterHit[]>("/training-centers");
      const trainingsReq = user
        ? api.get<AnnouncementHit[]>("/announcements").catch(() => ({ data: [] as AnnouncementHit[] }))
        : Promise.resolve({ data: [] as AnnouncementHit[] });
      const [cRes, tRes] = await Promise.all([centersReq, trainingsReq]);
      setCenters(cRes.data);
      setTrainings(tRes.data);
    } catch {
      setCenters([]);
      setTrainings([]);
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => {
    setLoaded(false);
    setTrainings([]);
  }, [user?.userId]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    };
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const hits = useMemo(() => {
    const q = query.trim();
    if (!q) return { trainings: [] as AnnouncementHit[], centers: [] as CenterHit[] };

    const tHits = trainings
      .filter((a) =>
        matchesSearch(q, [
          a.title,
          a.centerName,
          a.category,
          a.city,
          a.shortDescription,
          a.description,
          a.type,
          a.format,
        ])
      )
      .slice(0, MAX_PER_SECTION);

    const cHits = centers
      .filter((c) =>
        matchesSearch(q, [c.name, c.description, c.city, c.phone, (c.categories || []).join(" ")])
      )
      .slice(0, MAX_PER_SECTION);

    return { trainings: tHits, centers: cHits };
  }, [query, trainings, centers]);

  const totalHits = hits.trainings.length + hits.centers.length;
  const showPanel = open && query.trim().length > 0;

  const fmtDate = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString(lang === "en" ? "en-GB" : "ka-GE", {
      day: "numeric",
      month: "short",
    });
  };

  const go = (hit: Hit) => {
    setOpen(false);
    setQuery("");
    if (hit.kind === "training") {
      navigate(`/announcements?q=${encodeURIComponent(hit.item.title)}`);
    } else if (user) {
      navigate(`/centers/${hit.item.userId}`);
    } else {
      navigate(`/centers?q=${encodeURIComponent(hit.item.name)}`);
    }
  };

  const runSearch = () => {
    const q = query.trim();
    if (!q) return;
    setOpen(false);
    if (!user) {
      navigate(`/announcements?q=${encodeURIComponent(q)}`);
      return;
    }
    if (hits.trainings.length > 0 || hits.centers.length === 0) {
      navigate(`/announcements?q=${encodeURIComponent(q)}`);
    } else {
      navigate(`/centers?q=${encodeURIComponent(q)}`);
    }
    setQuery("");
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    runSearch();
  };

  return (
    <div className={`global-search${showPanel ? " is-open" : ""}`} ref={rootRef}>
      <form className="global-search-form" onSubmit={submit} role="search">
        <Search size={16} aria-hidden />
        <input
          ref={inputRef}
          type="search"
          value={query}
          placeholder={t("ძებნა ყველგან…", "Search everywhere…")}
          aria-label={t("ცენტრალური ძებნა", "Central search")}
          aria-expanded={showPanel}
          aria-controls="global-search-panel"
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            void ensureData();
          }}
        />
        {query && (
          <button
            type="button"
            className="global-search-clear"
            aria-label={t("გასუფთავება", "Clear")}
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
          >
            <X size={14} />
          </button>
        )}
      </form>

      {showPanel && (
        <div id="global-search-panel" className="global-search-panel" role="listbox">
          {!loaded ? (
            <div className="global-search-empty">{t("იტვირთება…", "Loading…")}</div>
          ) : (
            <>
              {!user && (
                <button
                  type="button"
                  className="global-search-gate"
                  onClick={() => {
                    setOpen(false);
                    navigate(`/announcements?q=${encodeURIComponent(query.trim())}`);
                  }}
                >
                  <Cap size={16} />
                  <span>
                    {t(
                      "ტრენინგების სანახავად შექმენი ანგარიში",
                      "Create an account to browse trainings"
                    )}
                  </span>
                </button>
              )}

              {user && hits.trainings.length > 0 && (
                <div className="global-search-section">
                  <div className="global-search-label">
                    <Cap size={13} /> {t("ტრენინგები", "Trainings")}
                  </div>
                  {hits.trainings.map((a) => (
                    <button
                      key={`t-${a.id}`}
                      type="button"
                      className="global-search-item"
                      role="option"
                      onClick={() => go({ kind: "training", item: a })}
                    >
                      <span className="global-search-item-main">
                        <strong>{a.title}</strong>
                        <span>
                          {a.centerName}
                          {a.city ? ` · ${a.city}` : ""}
                          {a.startDate ? ` · ${fmtDate(a.startDate)}` : ""}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {hits.centers.length > 0 && (
                <div className="global-search-section">
                  <div className="global-search-label">
                    <Users size={13} /> {t("ცენტრები", "Centers")}
                  </div>
                  {hits.centers.map((c) => (
                    <button
                      key={`c-${c.userId}`}
                      type="button"
                      className="global-search-item"
                      role="option"
                      onClick={() => go({ kind: "center", item: c })}
                    >
                      <span className="global-search-item-main">
                        <strong>{c.name}</strong>
                        <span>
                          {c.city ? (
                            <>
                              <Pin size={11} /> {c.city}
                            </>
                          ) : (
                            t("ტრენინგ ცენტრი", "Training center")
                          )}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {loaded && totalHits === 0 && (user || hits.centers.length === 0) && (
                <div className="global-search-empty">
                  {t("ვერაფერი მოიძებნა", "Nothing found")}
                </div>
              )}

              <button type="button" className="global-search-all" onClick={runSearch}>
                {t(`ყველა შედეგი „${query.trim()}“`, `All results for “${query.trim()}”`)}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
