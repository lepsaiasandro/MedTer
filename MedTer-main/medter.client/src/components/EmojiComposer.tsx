import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Smile } from "./icons";

const EMOJIS = [
  "😀", "😁", "😂", "🤣", "😊", "😇", "🙂", "😉",
  "😍", "😘", "😋", "😜", "🤪", "😎", "🤗", "🤔",
  "😐", "🙄", "😴", "😷", "🤒", "🤕", "🥳", "😢",
  "😭", "😤", "😠", "🤯", "👍", "👎", "👏", "🙏",
  "💪", "🤝", "👋", "❤️", "🧡", "💛", "💚", "💙",
  "💜", "🖤", "💯", "✨", "🔥", "⭐", "✅", "❌",
  "🎉", "🎁", "📌", "💊", "🩺", "🏥", "💉", "📅",
  "⏰", "📍", "💬", "📎", "👀", "🙌",
];

type Anchor = { top: number; left: number; above: boolean };

type Props = {
  inputRef: React.RefObject<HTMLTextAreaElement | HTMLInputElement | null>;
  value: string;
  onChange: (next: string) => void;
  label: string;
  className?: string;
};

export default function EmojiComposer({ inputRef, value, onChange, label, className }: Props) {
  const [anchor, setAnchor] = useState<Anchor | null>(null);

  useEffect(() => {
    if (!anchor) return;
    const close = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      if (!el.closest("[data-emoji]")) setAnchor(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAnchor(null);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [anchor]);

  const toggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (anchor) {
      setAnchor(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const width = Math.min(320, window.innerWidth - 16);
    const above = rect.top > 280;
    setAnchor({
      top: above ? rect.top - 8 : rect.bottom + 8,
      left: Math.min(Math.max(8, rect.right - width), window.innerWidth - width - 8),
      above,
    });
  };

  const insert = (emoji: string) => {
    const el = inputRef.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const next = value.slice(0, start) + emoji + value.slice(end);
    const caret = start + emoji.length;
    onChange(next);
    requestAnimationFrame(() => {
      const node = inputRef.current;
      if (!node) return;
      node.focus();
      node.setSelectionRange(caret, caret);
    });
  };

  return (
    <>
      <button
        type="button"
        className={className}
        data-emoji="1"
        aria-label={label}
        aria-expanded={!!anchor}
        onClick={toggle}
      >
        <Smile size={18} />
      </button>
      {anchor && createPortal(
        <div
          className={`emoji-board${anchor.above ? " above" : ""}`}
          data-emoji="1"
          style={{ top: anchor.top, left: anchor.left }}
          role="listbox"
          aria-label={label}
        >
          {EMOJIS.map((emoji) => (
            <button key={emoji} type="button" onClick={() => insert(emoji)} aria-label={emoji}>
              {emoji}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}
