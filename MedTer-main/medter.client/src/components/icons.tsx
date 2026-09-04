/* Shared inline-SVG icons (from the MedTer mockup). currentColor inherits. */
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number; sw?: number };

function Icon({ size = 18, sw = 1.8, children, ...rest }: IconProps & { children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" {...rest}>
      {children}
    </svg>
  );
}

/* Brand cross — filled, not stroked */
export const Logo = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M10 3h4v7h7v4h-7v7h-4v-7H3v-4h7z" fill="#fff" />
  </svg>
);

export const Bell = (p: IconProps) => <Icon {...p}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" /></Icon>;
export const Chat = (p: IconProps) => <Icon {...p}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></Icon>;
export const ChevronDown = (p: IconProps) => <Icon sw={2} {...p}><path d="M6 9l6 6 6-6" /></Icon>;
export const Home = (p: IconProps) => <Icon {...p}><path d="M3 12l9-9 9 9M5 10v10h14V10" /></Icon>;
export const Cap = (p: IconProps) => <Icon {...p}><path d="M22 10 12 5 2 10l10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></Icon>;
export const Plus = (p: IconProps) => <Icon sw={2.2} {...p}><path d="M12 5v14M5 12h14" /></Icon>;
export const Calendar = (p: IconProps) => <Icon sw={2} {...p}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></Icon>;
export const Pin = (p: IconProps) => <Icon sw={2} {...p}><path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></Icon>;
export const Mail = (p: IconProps) => <Icon sw={2} {...p}><path d="M22 8.5V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-1.5" /><path d="m2 8 10 6 10-6" /></Icon>;
export const Eye = (p: IconProps) => <Icon {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></Icon>;
export const Edit = (p: IconProps) => <Icon {...p}><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></Icon>;
export const Trash = (p: IconProps) => <Icon {...p}><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></Icon>;
export const Check = (p: IconProps) => <Icon sw={2.5} {...p}><path d="M20 6 9 17l-5-5" /></Icon>;
export const Search = (p: IconProps) => <Icon sw={2} {...p}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></Icon>;
export const Users = (p: IconProps) => <Icon sw={2} {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></Icon>;
export const Sliders = (p: IconProps) => <Icon sw={2} {...p}><path d="M3 6h18M7 12h10M11 18h2" /></Icon>;
export const ArrowLeft = (p: IconProps) => <Icon sw={2} {...p}><path d="M19 12H5M12 19l-7-7 7-7" /></Icon>;
export const Image = (p: IconProps) => <Icon sw={1.6} {...p}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-5-5L5 21" /></Icon>;
export const Upload = (p: IconProps) => <Icon {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M17 8l-5-5-5 5M12 3v12" /></Icon>;
export const Bulb = (p: IconProps) => <Icon sw={2} {...p}><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.3h6c0-1 .4-1.8 1-2.3A7 7 0 0 0 12 2z" /></Icon>;
export const Send = (p: IconProps) => <Icon sw={2} {...p}><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" /></Icon>;
export const Grid = (p: IconProps) => <Icon sw={2} {...p}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18" /></Icon>;
export const List = (p: IconProps) => <Icon sw={2} {...p}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" /></Icon>;
export const Doc = (p: IconProps) => <Icon sw={2} {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></Icon>;
export const Sun = (p: IconProps) => <Icon sw={2} {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></Icon>;
export const Moon = (p: IconProps) => <Icon sw={2} {...p}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></Icon>;
export const Trophy = (p: IconProps) => <Icon sw={1.9} {...p}><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 4H4v2a3 3 0 0 0 3 3M17 4h3v2a3 3 0 0 1-3 3" /></Icon>;
export const Funnel = (p: IconProps) => <Icon sw={2} {...p}><path d="M3 4h18l-7 8v6l-4 2v-8z" /></Icon>;
export const Bookmark = ({ filled, ...p }: IconProps & { filled?: boolean }) => (
  <svg width={p.size ?? 17} height={p.size ?? 17} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>
);
