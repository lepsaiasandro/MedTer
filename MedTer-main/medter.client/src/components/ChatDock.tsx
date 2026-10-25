import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import * as signalR from "@microsoft/signalr";
import api, { API_BASE } from "../api";
import { useAuth } from "../auth";
import { usePrefs } from "../i18n";
import { ArrowLeft, ChevronDown, Search, Send, X } from "./icons";

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

interface GroupMessage {
  id: number;
  groupId: number;
  senderId: string;
  senderName: string;
  text: string;
  sentAt: string;
  unsent?: boolean;
}

const AVATAR_COLORS = ["#3b82f6", "#f59e0b", "#8b5cf6", "#14b8a6", "#ef4444", "#06b6d4"];

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
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");

  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const activeRef = useRef<ChatGroup | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
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

    connection.start()
      .then(() => loadGroups().catch(() => {}))
      .catch(() => {});
    connectionRef.current = connection;
    return () => { connection.stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hidden, myId]);

  useEffect(() => {
    if (!active) return;
    api.get<GroupMessage[]>(`/chat/groups/${active.id}/messages`).then((r) => setMessages(r.data)).catch(() => {});
    api.post(`/chat/groups/${active.id}/read`).catch(() => {});
    connectionRef.current?.invoke("JoinGroup", active.id).catch(() => {});
    setGroups((prev) => prev.map((g) => (g.id === active.id ? { ...g, unreadCount: 0 } : g)));
  }, [active]);

  const lastId = messages[messages.length - 1]?.id;
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lastId, active?.id, open]);

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

  if (!user || location.pathname === "/chat") return null;

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
              <button type="button" className="msg-dock-icon" aria-label={t("უკან", "Back")} onClick={() => { setActive(null); setText(""); }}>
                <ArrowLeft size={18} />
              </button>
              <span className="msg-dock-av" style={{ background: colorFor(String(active.id)) }}>{initials(active.name)}</span>
              <div className="msg-dock-who">
                <b>{active.name}</b>
                <span>{active.memberCount} {t("წევრი", "members")}</span>
              </div>
            </div>
            <div className="msg-dock-msgs" ref={listRef}>
              {messages.map((m) => {
                const mine = m.senderId === myId;
                return (
                  <div key={m.id} className={`msg-dock-row${mine ? " mine" : ""}`}>
                    {!mine && <span className="msg-dock-av sm" style={{ background: colorFor(m.senderId) }}>{initials(m.senderName)}</span>}
                    <div>
                      {!mine && !m.unsent && <span className="msg-dock-sender">{m.senderName}</span>}
                      <p className={m.unsent ? "unsent" : ""}>
                        {m.unsent ? t("შეტყობინება გაუქმდა", "Message unsent") : m.text}
                      </p>
                      <time>{clock(m.sentAt)}</time>
                    </div>
                  </div>
                );
              })}
            </div>
            <form className="msg-dock-compose" onSubmit={send}>
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t("შეტყობინება...", "Message...")}
                aria-label={t("შეტყობინება", "Message")}
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
    </aside>
  );
}
