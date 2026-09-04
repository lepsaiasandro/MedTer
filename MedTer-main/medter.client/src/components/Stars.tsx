import { useState } from "react";

function Star({ fill, size = 16 }: { fill: number; size?: number }) {
  // fill: 0 empty, 1 full (half handled via clip for averages)
  const id = `g${Math.random().toString(36).slice(2)}`;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      {fill > 0 && fill < 1 && (
        <defs>
          <linearGradient id={id}>
            <stop offset={`${fill * 100}%`} stopColor="#f5a623" />
            <stop offset={`${fill * 100}%`} stopColor="var(--border-2)" />
          </linearGradient>
        </defs>
      )}
      <path
        d="M12 2l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.8 6.1 20.7l1.3-6.6L2.5 9.5l6.6-.8z"
        fill={fill >= 1 ? "#f5a623" : fill <= 0 ? "var(--border-2)" : `url(#${id})`}
      />
    </svg>
  );
}

/** Read-only average display: `value` (e.g. 4.3) + optional count. */
export function StarsView({ value, count, size = 15 }: { value: number; count?: number; size?: number }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      <span style={{ display: "inline-flex", gap: 1 }}>
        {[0, 1, 2, 3, 4].map((i) => <Star key={i} fill={Math.max(0, Math.min(1, value - i))} size={size} />)}
      </span>
      {count !== undefined && (
        <span style={{ fontSize: 12.5, color: "var(--muted)", fontWeight: 600 }}>
          {value ? value.toFixed(1) : "—"} {count > 0 && <span style={{ color: "var(--soft)", fontWeight: 500 }}>({count})</span>}
        </span>
      )}
    </span>
  );
}

/** Interactive rating input. Calls onRate(stars). */
export function StarsInput({ value, onRate, size = 26 }: { value: number; onRate: (n: number) => void; size?: number }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <span style={{ display: "inline-flex", gap: 3 }} onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onMouseEnter={() => setHover(n)}
          onClick={() => onRate(n)}
          style={{ border: "none", background: "none", cursor: "pointer", padding: 0, lineHeight: 0 }}
          aria-label={`${n} ვარსკვლავი`}
        >
          <Star fill={n <= shown ? 1 : 0} size={size} />
        </button>
      ))}
    </span>
  );
}
