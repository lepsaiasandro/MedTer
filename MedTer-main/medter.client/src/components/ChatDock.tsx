import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import * as signalR from "@microsoft/signalr";
import api, { API_BASE } from "../api";
import { useAuth } from "../auth";
import { usePrefs } from "../i18n";
import EmojiComposer from "./EmojiComposer";
import { ArrowLeft, ChevronDown, Search, Send, Smile, Trash, Users, X } from "./icons";

interface ChatGroup {
  id: number;
  name: string;
  city?: string;
  memberCount: number;
  lastMessageAt?: string | null;
  lastMessagePreview?: string | null;
  unreadCount: number;
  lastMessageUnsent?: boolean;
}

interface ReactionUser {
  userId: string;
  displayName: string;
}

interface MessageReaction {
  emoji: string;
  count: number;
  users: ReactionUser[];
}

interface GroupMessage {
  id: number;
  groupId: number;
  senderId: string;
  senderName: string;
  text: string;
  sentAt: string;
  unsent?: boolean;
  reactions?: MessageReaction[];
}

interface GroupMember {
  userId: string;
  displayName: string;
  role: string;
  city?: string;
}

interface UnsentEvent {
  messageId: number;
  groupId: number;
  lastMessagePreview?: string | null;
  lastMessageAt?: string | null;
  lastMessageUnsent: boolean;
}

interface ReactionsEvent {
  messageId: number;
  groupId: number;
  reactions: MessageReaction[];
}

type PickerAnchor = {
  id: number;
  top: number;
  left: number;
  above: boolean;
  end: boolean;
};

const AVATAR_COLORS = ["#3b82f6", "#f59e0b", "#8b5cf6", "#14b8a6", "#ef4444", "#06b6d4"];
const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

function colorFor(id: string) {
  let n = 0;
  for (let i = 0; i < id.length; i++) n = (n + id.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[n];
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return (parts[0] || "?").slice(0, 2).toUpperCase();
}

function clock(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("ka-GE", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
}

const sortByRecent = (list: ChatGroup[]) =>
  [...list].sort((a, b) => new Date(b.lastMessageAt ?? 0).getTime() - new Date(a.lastMessageAt ?? 0).getTime());

export default function ChatDock() {
  const { user } = useAuth();
  const { t } = usePrefs();
  const location = useLocation();
  const hidden = !user || location.pathname === "/chat";

  const [open, setOpen] = useState(false);
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [active, setActive] = useState<ChatGroup | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [showMembers, setShowMembers] = useState(false);
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  const [picker, setPicker] = useState<PickerAnchor | null>(null);

  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const activeRef = useRef<ChatGroup | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLInputElement>(null);
  activeRef.current = active;
  const myId = user?.userId;

  const loadGroups = async () => {
    const { data } = await api.get<ChatGroup[]>("/chat/groups");
    const sorted = sortByRecent(data);
    setGroups(sorted);
    const conn = connectionRef.current;
    if (conn?.state === signalR.HubConnectionState.Connected) {
      for (const g of sorted) conn.invoke("JoinGroup", g.id).catch(() => {});
    }
  };

  useEffect(() => {
    if (hidden) return;
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_BASE}/hubs/chat`, { accessTokenFactory: () => localStorage.getItem("token") ?? "" })
      .withAutomaticReconnect()
      .build();

    connection.on("ReceiveGroupMessage", (msg: GroupMessage) => {
      const current = activeRef.current;
      const inActive = !!current && msg.groupId === current.id;
      const incoming = msg.senderId !== myId;
      if (inActive) setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      if (inActive && incoming) api.post(`/chat/groups/${msg.groupId}/read`).catch(() => {});
      setGroups((prev) =>
        sortByRecent(prev.map((g) =>
          g.id === msg.groupId
            ? {
                ...g,
                lastMessageAt: msg.sentAt,
                lastMessagePreview: msg.text,
                lastMessageUnsent: false,
                unreadCount: incoming && !inActive ? (g.unreadCount ?? 0) + 1 : inActive ? 0 : g.unreadCount,
              }
            : g
        ))
      );
    });

    connection.on("MessageReactionsUpdated", (evt: ReactionsEvent) => {
      const current = activeRef.current;
      if (!current || evt.groupId !== current.id) return;
      setMessages((prev) => prev.map((m) => (m.id === evt.messageId ? { ...m, reactions: evt.reactions } : m)));
    });

    connection.on("GroupMessageUnsent", (evt: UnsentEvent) => {
      const current = activeRef.current;
      if (current && evt.groupId === current.id) {
        setMessages((prev) => prev.map((m) => (
          m.id === evt.messageId ? { ...m, text: "", unsent: true, reactions: [] } : m
        )));
      }
      setGroups((prev) =>
        sortByRecent(prev.map((g) =>
          g.id === evt.groupId
            ? {
                ...g,
                lastMessageAt: evt.lastMessageAt,
                lastMessagePreview: evt.lastMessagePreview,
                lastMessageUnsent: evt.lastMessageUnsent,
              }
            : g
        ))
      );
      setPicker((currentPicker) => (currentPicker?.id === evt.messageId ? null : currentPicker));
    });

    connection.start()
      .then(() => loadGroups().catch(() => {}))
      .catch(() => {});
    connectionRef.current = connection;
    return () => { connection.stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hidden, myId]);

  useEffect(() => {
    if (!active) return;
    setPicker(null);
    setShowMembers(false);
    api.get<GroupMessage[]>(`/chat/groups/${active.id}/messages`).then((r) => setMessages(r.data)).catch(() => {});
    api.get<GroupMember[]>(`/chat/groups/${active.id}/members`).then((r) => setMembers(r.data)).catch(() => {});
    api.post(`/chat/groups/${active.id}/read`).catch(() => {});
    connectionRef.current?.invoke("JoinGroup", active.id).catch(() => {});
    setGroups((prev) => prev.map((g) => (g.id === active.id ? { ...g, unreadCount: 0 } : g)));
  }, [active]);

  const lastId = messages[messages.length - 1]?.id;
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lastId, active?.id, open]);

  useEffect(() => {
    if (!picker) return;
    const close = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      if (!el.closest("[data-react]")) setPicker(null);
    };
    const onScroll = () => setPicker(null);
    document.addEventListener("mousedown", close);
    listRef.current?.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      document.removeEventListener("mousedown", close);
      listRef.current?.removeEventListener("scroll", onScroll);
    };
  }, [picker]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) =>
      [g.name, g.city, g.lastMessagePreview].some((v) => (v ?? "").toLowerCase().includes(q))
    );
  }, [groups, query]);

  const unread = groups.reduce((n, g) => n + (g.unreadCount ?? 0), 0);

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const body = text.trim();
    if (!body || !active) return;
    const conn = connectionRef.current;
    if (!conn || conn.state !== signalR.HubConnectionState.Connected) return;
    setText("");
    await conn.invoke("SendGroupMessage", active.id, body);
  };

  const hubReady = () => {
    const conn = connectionRef.current;
    return conn && conn.state === signalR.HubConnectionState.Connected ? conn : null;
  };

  const reactTo = async (message: GroupMessage, emoji: string) => {
    if (!active || message.unsent) return;
    const conn = hubReady();
    if (!conn) return;
    await conn.invoke("ToggleReaction", active.id, message.id, emoji);
    setPicker(null);
  };

  const unsend = async (message: GroupMessage) => {
    if (!active || message.unsent || message.senderId !== myId) return;
    const ok = window.confirm(t("გავაუქმოთ ეს შეტყობინება ყველასთვის?", "Unsend this message for everyone?"));
    if (!ok) return;
    const conn = hubReady();
    if (!conn) return;
    await conn.invoke("UnsendGroupMessage", active.id, message.id);
    setPicker(null);
  };

  const togglePicker = (e: React.MouseEvent<HTMLButtonElement>, id: number, mine: boolean) => {
    if (picker?.id === id) {
      setPicker(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const above = rect.top > 56;
    setPicker({
      id,
      top: above ? rect.top - 6 : rect.bottom + 6,
      left: mine ? rect.right : rect.left,
      above,
      end: mine,
    });
  };

  if (!user || location.pathname === "/chat") return null;

  const picked = picker ? messages.find((item) => item.id === picker.id) : null;

  return (
    <aside className={`msg-dock${open ? " open" : ""}`} aria-label={t("შეტყობინებები", "Messages")}>
      <header className="msg-dock-bar">
        <button type="button" className="msg-dock-title" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          <span className="msg-dock-av" style={{ background: colorFor(user.userId) }}>{initials(user.displayName)}</span>
          <b>{t("შეტყობინებები", "Messages")}</b>
          {unread > 0 && <em>{unread > 9 ? "9+" : unread}</em>}
        </button>
        <button
          type="button"
          className="msg-dock-icon"
          aria-label={open ? t("ჩაკეცვა", "Collapse") : t("გაშლა", "Expand")}
          onClick={() => setOpen((v) => !v)}
        >
          <ChevronDown size={18} />
        </button>
      </header>

      {open && (
        active ? (
          <div className="msg-dock-thread">
            <div className="msg-dock-thread-head">
              <button type="button" className="msg-dock-icon" aria-label={t("უკან", "Back")} onClick={() => { setActive(null); setText(""); setShowMembers(false); setPicker(null); }}>
                <ArrowLeft size={18} />
              </button>
              <span className="msg-dock-av" style={{ background: colorFor(String(active.id)) }}>{initials(active.name)}</span>
              <div className="msg-dock-who">
                <b>{active.name}</b>
                <span>{active.memberCount} {t("წევრი", "members")}</span>
              </div>
              <button
                type="button"
                className={`msg-dock-icon${showMembers ? " on" : ""}`}
                aria-label={t("წევრები", "Members")}
                aria-expanded={showMembers}
                onClick={() => setShowMembers((v) => !v)}
              >
                <Users size={16} />
              </button>
            </div>
            {showMembers && (
              <div className="group-members">
                {members.map((m) => (
                  <div key={m.userId} className="group-member">
                    <span className="cav" style={{ width: 28, height: 28, fontSize: 12, background: colorFor(m.userId) }}>{m.displayName.charAt(0)}</span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="cname" style={{ fontSize: 13 }}>{m.displayName}{m.userId === myId ? ` (${t("შენ", "you")})` : ""}</div>
                      <div className="crole">
                        {m.role === "Doctor" ? t("ექიმი", "Doctor") : t("ტრენინგ ცენტრი", "Training Center")}
                        {m.city ? ` · ${m.city}` : ""}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="msg-dock-msgs" ref={listRef}>
              {messages.map((m) => {
                const mine = m.senderId === myId;
                const reactions = m.reactions ?? [];
                const mineEmoji = (emoji: string) =>
                  reactions.some((r) => r.emoji === emoji && r.users.some((u) => u.userId === myId));
                return (
                  <div key={m.id} className={`msg-dock-row${mine ? " mine" : ""}`}>
                    {!mine && <span className="msg-dock-av sm" style={{ background: colorFor(m.senderId) }}>{initials(m.senderName)}</span>}
                    <div className="msg-dock-bubble">
                      {!mine && !m.unsent && <span className="msg-dock-sender">{m.senderName}</span>}
                      <p className={m.unsent ? "unsent" : ""}>
                        {m.unsent ? t("შეტყობინება გაუქმდა", "Message unsent") : m.text}
                      </p>
                      <div className="msg-dock-meta">
                        <time>{clock(m.sentAt)}</time>
                        {!m.unsent && (
                          <button
                            type="button"
                            className="bubble-act"
                            data-react="1"
                            aria-label={t("რეაქცია", "React")}
                            onClick={(e) => togglePicker(e, m.id, mine)}
                          >
                            <Smile size={13} />
                          </button>
                        )}
                        {mine && !m.unsent && (
                          <button
                            type="button"
                            className="bubble-act"
                            data-react="1"
                            aria-label={t("გაუქმება", "Unsend")}
                            title={t("გაუქმება ყველასთვის", "Unsend for everyone")}
                            onClick={() => void unsend(m)}
                          >
                            <Trash size={13} />
                          </button>
                        )}
                      </div>
                      {reactions.length > 0 && !m.unsent && (
                        <div className="msg-reacts">
                          {reactions.map((r) => (
                            <button
                              key={r.emoji}
                              type="button"
                              className={`msg-react${mineEmoji(r.emoji) ? " mine" : ""}`}
                              title={r.users.map((u) => u.displayName).filter(Boolean).join(", ")}
                              onClick={() => void reactTo(m, r.emoji)}
                            >
                              <span>{r.emoji}</span>
                              <span>{r.count}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <form className="msg-dock-compose" onSubmit={send}>
              <input
                ref={composerRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t("შეტყობინება...", "Message...")}
                aria-label={t("შეტყობინება", "Message")}
              />
              <EmojiComposer
                inputRef={composerRef}
                value={text}
                onChange={setText}
                label={t("სმაილი", "Emoji")}
                className="msg-dock-emoji"
              />
              <button type="submit" disabled={!text.trim()} aria-label={t("გაგზავნა", "Send")}>
                <Send size={16} />
              </button>
            </form>
          </div>
        ) : (
          <div className="msg-dock-inbox">
            <label className="msg-dock-search">
              <Search size={15} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("ძებნა", "Search")}
                aria-label={t("საუბრების ძებნა", "Search conversations")}
              />
              {query && (
                <button type="button" aria-label={t("გასუფთავება", "Clear")} onClick={() => setQuery("")}>
                  <X size={14} />
                </button>
              )}
            </label>
            <div className="msg-dock-list">
              {filtered.length === 0 && (
                <p className="msg-dock-empty">
                  {groups.length === 0
                    ? t("ჯგუფები ჯერ არ არის", "No groups yet")
                    : t("შედეგი ვერ მოიძებნა", "No results found")}
                </p>
              )}
              {filtered.map((g) => {
                const count = g.unreadCount ?? 0;
                return (
                  <button key={g.id} type="button" className="msg-dock-item" onClick={() => setActive(g)}>
                    <span className="msg-dock-av" style={{ background: colorFor(String(g.id)) }}>{initials(g.name)}</span>
                    <span className="msg-dock-item-copy">
                      <b className={count > 0 ? "unread" : ""}>{g.name}</b>
                      <span>
                        {g.lastMessageUnsent
                          ? t("შეტყობინება გაუქმდა", "Message unsent")
                          : (g.lastMessagePreview || t("ჯერ შეტყობინება არ არის", "No messages yet"))}
                      </span>
                    </span>
                    <span className="msg-dock-item-meta">
                      <time>{clock(g.lastMessageAt)}</time>
                      {count > 0 && <i>{count > 9 ? "9+" : count}</i>}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )
      )}
      {picked && !picked.unsent && picker && createPortal(
        <div
          className={`react-picker is-pop${picker.above ? " above" : ""}${picker.end ? " end" : ""}`}
          data-react="1"
          style={{ top: picker.top, left: picker.left }}
        >
          {REACTION_EMOJIS.map((emoji) => {
            const reactions = picked.reactions ?? [];
            const on = reactions.some((r) => r.emoji === emoji && r.users.some((u) => u.userId === myId));
            return (
              <button
                key={emoji}
                type="button"
                className={on ? "on" : ""}
                onClick={() => void reactTo(picked, emoji)}
                aria-label={emoji}
              >
                {emoji}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </aside>
  );
}
