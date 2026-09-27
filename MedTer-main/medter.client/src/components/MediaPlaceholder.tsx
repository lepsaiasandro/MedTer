/** Branded card media when no real image is uploaded. */
export default function MediaPlaceholder({
  title,
  subtitle,
  variant = "brand",
}: {
  title: string;
  subtitle?: string;
  variant?: "brand" | "teal" | "navy";
}) {
  const initial = (title || "?").trim().charAt(0).toUpperCase() || "?";
  return (
    <div className={`media-ph media-ph--${variant}`} aria-hidden="true">
      <span className="media-ph-mark">{initial}</span>
      <span className="media-ph-title">{title}</span>
      {subtitle && <span className="media-ph-sub">{subtitle}</span>}
      <span className="media-ph-grid" />
    </div>
  );
}
