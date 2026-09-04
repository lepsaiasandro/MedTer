import { useRef, useState } from "react";
import { createPortal } from "react-dom";

/* Brand glyphs (simplified, monochrome — inherit currentColor). */
const WhatsApp = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.7 4.8-1.3A10 10 0 1 0 12 2zm0 2a8 8 0 1 1-4.1 14.9l-.3-.2-2.8.7.8-2.7-.2-.3A8 8 0 0 1 12 4zm4.5 9.9c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.5.1l-.7.9c-.1.2-.3.2-.5.1a6.5 6.5 0 0 1-3.2-2.8c-.1-.2 0-.4.1-.5l.4-.5c.1-.1.1-.3 0-.4l-.7-1.7c-.2-.4-.4-.4-.5-.4h-.5c-.2 0-.4.1-.6.3-.7.7-.9 1.7-.5 2.8a8 8 0 0 0 3.9 4.3c1.9.9 2.6.8 3.4.7.5-.1 1.4-.6 1.6-1.1.2-.6.2-1 .1-1.1z"/></svg>;
const Facebook = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.4h-1.2c-1.2 0-1.6.8-1.6 1.5V12h2.7l-.4 2.9h-2.3v7A10 10 0 0 0 22 12z"/></svg>;
const Telegram = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M21.9 4.3 18.5 20c-.2 1-.9 1.3-1.8.8l-4.9-3.6-2.4 2.3c-.3.3-.5.5-1 .5l.3-4.9L17.6 6c.4-.4-.1-.6-.6-.2L6.7 12.6l-4.7-1.5c-1-.3-1-1 .2-1.5l18.4-7.1c.9-.3 1.6.2 1.3 1.8z"/></svg>;
const LinkIc = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg>;
const ShareIc = () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5 8.6 10.5"/></svg>;

const MENU_W = 220;
const MENU_H = 210;

export default function ShareMenu({ title, url }: { title: string; url?: string }) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const link = url || window.location.origin;
  const text = `${title} — MedTer`;

  const targets = [
    { label: "WhatsApp", icon: <WhatsApp />, href: `https://wa.me/?text=${encodeURIComponent(text + " " + link)}` },
    { label: "Facebook", icon: <Facebook />, href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}` },
    { label: "Telegram", icon: <Telegram />, href: `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}` },
  ];

  // Positioned with fixed coords so the card's `overflow:hidden` can't clip it.
  const toggle = () => {
    if (pos) { setPos(null); return; }
    const r = btnRef.current!.getBoundingClientRect();
    const left = Math.max(8, Math.min(r.right - MENU_W, window.innerWidth - MENU_W - 8));
    // Open downward if there's room, otherwise flip above the button.
    const top = window.innerHeight - r.bottom > MENU_H + 12 ? r.bottom + 6 : Math.max(8, r.top - MENU_H - 6);
    setPos({ top, left });
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(`${text} ${link}`); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ }
    setPos(null);
  };

  return (
    <>
      <button ref={btnRef} className="act" title="გაზიარება" onClick={toggle}><ShareIc /></button>
      {/* Rendered into <body> via a portal so no parent's transform/overflow can clip it. */}
      {pos && createPortal(
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 119 }} onClick={() => setPos(null)} />
          <div className="dropdown" style={{ position: "fixed", top: pos.top, left: pos.left, width: MENU_W, zIndex: 120 }}>
            <div className="dd-title">გაზიარება</div>
            {targets.map((t) => (
              <a key={t.label} className="dd-item" href={t.href} target="_blank" rel="noopener noreferrer"
                style={{ display: "flex", alignItems: "center", gap: 10 }} onClick={() => setPos(null)}>
                {t.icon} {t.label}
              </a>
            ))}
            <button className="dd-item" style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }} onClick={copy}>
              <LinkIc /> {copied ? "დაკოპირდა ✓" : "ბმულის კოპირება"}
            </button>
          </div>
        </>,
        document.body
      )}
    </>
  );
}
