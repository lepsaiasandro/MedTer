export function CardSkeleton() {
  return (
    <article className="card skeleton-card" aria-hidden="true">
      <div className="skeleton skeleton-media" />
      <div className="body">
        <div className="skeleton skeleton-chip" />
        <div className="skeleton skeleton-line" style={{ width: "78%" }} />
        <div className="skeleton skeleton-line" style={{ width: "52%" }} />
        <div className="skeleton skeleton-line" style={{ width: "64%", marginTop: 8 }} />
      </div>
    </article>
  );
}

export function SkeletonGrid({ count = 6, cols = "grid" }: { count?: number; cols?: string }) {
  return (
    <div className={`grid ${cols === "grid-4" ? "grid-4" : ""}`.trim()} aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
