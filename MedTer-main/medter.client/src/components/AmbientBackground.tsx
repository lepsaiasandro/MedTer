import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

const ACTIVE_MS = 4200;

/** Dense app surfaces get a quieter ambient (mesh/orbs only). */
const QUIET_PREFIXES = ["/chat", "/admin", "/announcements", "/my-announcements", "/certificates", "/profile", "/centers"];

function isQuietPath(pathname: string) {
  if (pathname === "/") return false;
  return QUIET_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

/** Fixed medical ambient layer — animates only while the user is interacting. */
export default function AmbientBackground() {
  const { pathname } = useLocation();
  const quiet = isQuietPath(pathname);
  const [active, setActive] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const wake = () => {
      if (document.visibilityState === "hidden") return;
      setActive(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setActive(false), ACTIVE_MS);
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        setActive(false);
        if (timer.current) clearTimeout(timer.current);
      }
    };

    window.addEventListener("pointerdown", wake, { passive: true });
    window.addEventListener("keydown", wake, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("pointerdown", wake);
      window.removeEventListener("keydown", wake);
      document.removeEventListener("visibilitychange", onVisibility);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return (
    <div
      className={`ambient${active ? " ambient--live" : ""}${quiet ? " ambient--quiet" : ""}`}
      aria-hidden="true"
    >
      <div className="ambient-mesh" />
      <div className="ambient-orb ambient-orb-a" />
      <div className="ambient-orb ambient-orb-b" />
      <div className="ambient-orb ambient-orb-c" />

      {!quiet && (
        <>
          <div className="ambient-vitals">
            <span className="ambient-vital ambient-vital-1" />
            <span className="ambient-vital ambient-vital-2" />
            <span className="ambient-vital ambient-vital-3" />
            <span className="ambient-heartbeat" />
          </div>

          <svg className="ambient-ecg" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path
              className="ambient-ecg-path"
              d="M0 60 H80 L95 60 L110 20 L125 100 L140 50 L155 60 H280 L295 60 L310 18 L325 102 L340 48 L355 60 H480 L495 60 L510 22 L525 98 L540 52 L555 60 H680 L695 60 L710 16 L725 104 L740 46 L755 60 H880 L895 60 L910 24 L925 96 L940 54 L955 60 H1080 L1095 60 L1110 20 L1125 100 L1140 50 L1155 60 H1200"
              fill="none"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </>
      )}

      <div className="ambient-dots" />
    </div>
  );
}
