import { Link } from "react-router-dom";
import { usePrefs } from "../i18n";
import ShareMenu from "./ShareMenu";
import { Calendar, Pin, Check, Cap, Chat, Bookmark, Video, ThumbUp } from "./icons";
import { pickCardBanner } from "../lib/cardBanners";

export interface EventDetailData {
  id: number;
  title: string;
  category?: string;
  format?: string;
  shortDescription?: string;
  description?: string;
  city?: string;
  meetingAccess?: string;
  duration?: string;
  language?: string;
  points: number;
  price: number;
  seats?: number;
  imageUrl?: string;
  startDate?: string;
  registrationDeadline?: string;
  centerUserId?: string;
  centerName: string;
  interestedCount: number;
  isInterested: boolean;
  isFavorite: boolean;
  hasGroupChat?: boolean;
  createdAt?: string;
  likeCount?: number;
  isLiked?: boolean;
}

type Props = {
  a: EventDetailData;
  isDoctor: boolean;
  mineTab: boolean;
  busyId: number | null;
  whenFull: string;
  placeLabel: string;
  dateParts: { day: number; month: string; weekday?: string; year?: number } | null;
  fmtDate: (iso?: string) => string;
  meetingAccess: React.ReactNode;
  onClose: () => void;
  onStop: (e: React.MouseEvent | React.KeyboardEvent) => void;
  onSave: () => void;
  onLike: () => void;
  onGoing: () => void;
  onChat: () => void;
};

export default function EventDetailModal({
  a, isDoctor, mineTab, busyId, whenFull, placeLabel, dateParts, fmtDate,
  meetingAccess, onClose, onStop, onSave, onLike, onGoing, onChat,
}: Props) {
  const { t } = usePrefs();
  const cover = pickCardBanner(a.id, a.imageUrl);
  const going = mineTab || a.isInterested;
  const hostInitial = (a.centerName || "?").charAt(0).toUpperCase();
  const online = a.format === "ონლაინ";

  return (
    <div className="modal fb-event-modal" onClick={onClose}>
      <div className="box fb-event-page" onClick={onStop}>
        <button type="button" className="fb-event-page-close" aria-label={t("დახურვა", "Close")} onClick={onClose}>
          ×
        </button>

        <div className="fb-event-page-cover">
          <img src={cover} alt="" />
          <div className="fb-event-datechip">
            {dateParts ? (
              <>
                <span className="fb-event-month">{dateParts.month}</span>
                <span className="fb-event-day">{dateParts.day}</span>
              </>
            ) : (
              <>
                <span className="fb-event-month">—</span>
                <span className="fb-event-day"><Calendar size={16} /></span>
              </>
            )}
          </div>
        </div>

        <div className="fb-event-page-main">
          <div className="fb-event-page-when">{whenFull}</div>
          <h2 className="fb-event-page-title">{a.title}</h2>
          <div className="fb-event-page-privacy">
            {t("ტრენინგი", "Training")}
            <span className="fb-event-dot">·</span>
            {t("ორგანიზატორი", "Hosted by")}{" "}
            {a.centerUserId ? (
              <Link to={`/centers/${a.centerUserId}`} onClick={onClose}>{a.centerName}</Link>
            ) : (
              <strong>{a.centerName}</strong>
            )}
          </div>

          <div className="fb-event-page-guests">
            <div className="fb-event-guest-counts">
              <b className="social-like-count"><ThumbUp size={14} filled /> {a.likeCount ?? 0} {t("ლაიქი", "likes")}</b>
              {a.interestedCount > 0 && (
                <b>{a.interestedCount} {t("მიდის", "going")}</b>
              )}
            </div>
          </div>

          <div className="fb-event-actions fb-event-page-rsvp">
            {isDoctor && (
              <button type="button" className={`fb-rsvp fb-rsvp-primary${going ? " active going" : ""}`} disabled={busyId === a.id} onClick={onGoing}>
                <Check size={16} />
                {going ? t("რეგისტრირებული", "Registered") : t("რეგისტრაცია", "Register")}
              </button>
            )}
            <button type="button" className={`fb-rsvp${a.isLiked ? " active like" : ""}`} onClick={onLike}>
              <ThumbUp size={16} filled={a.isLiked} />
              {a.isLiked ? t("მოგწონს", "Liked") : t("ლაიქი", "Like")}
            </button>
            {isDoctor && (
              <button type="button" className={`fb-rsvp${a.isFavorite ? " active saved" : ""}`} disabled={busyId === a.id} onClick={onSave}>
                <Bookmark size={16} filled={a.isFavorite} />
                {a.isFavorite ? t("შენახული", "Saved") : t("შენახვა", "Save")}
              </button>
            )}
            {mineTab && a.hasGroupChat && (
              <button type="button" className="fb-rsvp" onClick={onChat}>
                <Chat size={16} /> {t("ჩატი", "Chat")}
              </button>
            )}
            <ShareMenu title={a.title} className="fb-rsvp" label={t("გაზიარება", "Share")} />
          </div>

          <div className="fb-event-page-grid">
            <section className="fb-event-panel">
              <h3>{t("დეტალები", "Details")}</h3>
              <ul className="fb-event-detail-list">
                <li>
                  <Calendar size={18} />
                  <div>
                    <b>{whenFull}</b>
                    {a.duration && <span>{a.duration}</span>}
                  </div>
                </li>
                <li>
                  {online ? <Video size={18} /> : <Pin size={18} />}
                  <div>
                    <b>{placeLabel}</b>
                    <span>
                      {online
                        ? t("ონლაინ ტრენინგი", "Online training")
                        : t("დასწრებით", "In person")}
                    </span>
                  </div>
                </li>
                {a.price > 0 ? (
                  <li>
                    <Cap size={18} />
                    <div>
                      <b>{a.price} ₾</b>
                      <span>{t("ბილეთი / რეგისტრაცია", "Ticket / registration")}</span>
                    </div>
                  </li>
                ) : (
                  <li>
                    <Cap size={18} />
                    <div>
                      <b>{t("უფასო", "Free")}</b>
                      <span>{t("რეგისტრაცია საჭიროა", "Registration required")}</span>
                    </div>
                  </li>
                )}
                {a.points > 0 && (
                  <li>
                    <Check size={18} />
                    <div>
                      <b>{a.points} {t("უპგ ქულა", "CPD points")}</b>
                      <span>{t("სერტიფიკატის შემდეგ", "After certificate")}</span>
                    </div>
                  </li>
                )}
                {typeof a.seats === "number" && a.seats > 0 && (
                  <li>
                    <Cap size={18} />
                    <div>
                      <b>{a.seats}</b>
                      <span>{t("ადგილების რაოდენობა", "Available seats")}</span>
                    </div>
                  </li>
                )}
                {a.language && (
                  <li>
                    <Calendar size={18} />
                    <div>
                      <b>{a.language}</b>
                      <span>{t("ენა", "Language")}</span>
                    </div>
                  </li>
                )}
                {a.createdAt && (
                  <li>
                    <Calendar size={18} />
                    <div>
                      <b>{fmtDate(a.createdAt)}</b>
                      <span>{t("გამოქვეყნების თარიღი", "Published")}</span>
                    </div>
                  </li>
                )}
                {a.registrationDeadline && (
                  <li>
                    <Calendar size={18} />
                    <div>
                      <b>{fmtDate(a.registrationDeadline)}</b>
                      <span>{t("რეგისტრაციის ვადა", "Registration deadline")}</span>
                    </div>
                  </li>
                )}
                {a.category && (
                  <li>
                    <Bookmark size={18} />
                    <div>
                      <b>{a.category}</b>
                      <span>{t("კატეგორია", "Category")}</span>
                    </div>
                  </li>
                )}
              </ul>
              {meetingAccess}
            </section>

            <section className="fb-event-panel">
              <h3>{t("შესახებ", "About")}</h3>
              {(a.description || a.shortDescription) ? (
                <p className="fb-event-about">{a.description || a.shortDescription}</p>
              ) : (
                <p className="fb-event-about muted">{t("აღწერა ჯერ არ არის დამატებული.", "No description added yet.")}</p>
              )}

              <h3 className="fb-event-host-title">{t("ორგანიზატორი", "Host")}</h3>
              <div className="fb-event-host-card">
                <span className="fb-event-host-av">{hostInitial}</span>
                <div>
                  {a.centerUserId ? (
                    <Link to={`/centers/${a.centerUserId}`} onClick={onClose}>{a.centerName}</Link>
                  ) : (
                    <b>{a.centerName}</b>
                  )}
                  <span>{t("ტრენინგ ცენტრი", "Training center")}</span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
