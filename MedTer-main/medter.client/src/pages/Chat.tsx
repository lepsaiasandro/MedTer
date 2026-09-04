import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import * as signalR from "@microsoft/signalr";
import api, { API_BASE } from "../api";
import { useAuth } from "../auth";
import { usePrefs } from "../i18n";
import { Send } from "../components/icons";

interface Contact {
  id: string;
  displayName: string;
  role: string;
  city?: string;
  lastMessageAt?: string | null;
  unreadCount?: number;
}

const sortByRecent = (list: Contact[]) =>
  [...list].sort((a, b) => new Date(b.lastMessageAt ?? 0).getTime() - new Date(a.lastMessageAt ?? 0).getTime());

interface Message { id: number; senderId: string; receiverId: string; text: string; sentAt: string; }

export default function Chat() {
  const { user } = useAuth();
  const { t } = usePrefs();
  const location = useLocation();
  const preselect = (location.state as { contact?: Contact } | null)?.contact ?? null;
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [active, setActive] = useState<Contact | null>(preselect);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const activeRef = useRef<Contact | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  activeRef.current = active;
  const myId = user?.userId;

  useEffect(() => {
    api.get<Contact[]>("/chat/contacts").then((r) => setContacts(sortByRecent(r.data)));
  }, []);

  useEffect(() => {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_BASE}/hubs/chat`, { accessTokenFactory: () => localStorage.getItem("token") ?? "" })
      .withAutomaticReconnect()
      .build();

    connection.on("ReceiveMessage", (msg: Message) => {
      const current = activeRef.current;
      const otherId = msg.senderId === myId ? msg.receiverId : msg.senderId;
      const inActiveConv = !!current && otherId === current.id;
      const incoming = msg.senderId !== myId;

      if (inActiveConv) setMessages((prev) => [...prev, msg]);
      if (inActiveConv && incoming) api.post(`/chat/${otherId}/read`).catch(() => {});

      setContacts((prev) =>
        sortByRecent(prev.map((c) =>
          c.id === otherId
            ? { ...c, lastMessageAt: msg.sentAt, unreadCount: incoming && !inActiveConv ? (c.unreadCount ?? 0) + 1 : c.unreadCount }
            : c
        ))
      );
    });

    connection.start().catch(console.error);
    connectionRef.current = connection;
    return () => { connection.stop(); };
  }, [myId]);

  useEffect(() => {
    if (!active) return;
    api.get<Message[]>(`/chat/${active.id}`).then((r) => setMessages(r.data));
    setContacts((prev) => prev.map((c) => (c.id === active.id ? { ...c, unreadCount: 0 } : c)));
  }, [active]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !active) return;
    await connectionRef.current?.invoke("SendMessage", active.id, text.trim());
    setText("");
  };

  return (
    <div className="chat">
      {/* Contacts */}
      <div className="chat-aside">
        <div className="head">{t("კონტაქტები", "Contacts")}</div>
        <div className="chat-list">
          {contacts.length === 0 && <p style={{ padding: 16, fontSize: 13, color: "var(--soft)" }}>{t("კონტაქტები არ არის", "No contacts")}</p>}
          {contacts.map((c) => {
            const unread = c.unreadCount ?? 0;
            return (
              <button key={c.id} onClick={() => setActive(c)} className={`contact ${active?.id === c.id ? "active" : ""}`}>
                <span className="cav">{c.displayName.charAt(0)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className={`cname ${unread > 0 ? "unread" : ""}`} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.displayName}</div>
                  <div className="crole">{c.role === "Doctor" ? t("ექიმი", "Doctor") : t("ტრენინგ ცენტრი", "Training Center")}{c.city ? ` · ${c.city}` : ""}</div>
                </div>
                {unread > 0 && <span className="cbadge">{unread > 9 ? "9+" : unread}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Conversation */}
      <div className="chat-main">
        {!active ? (
          <div className="chat-empty">{t("აირჩიე კონტაქტი მიმოწერის დასაწყებად", "Select a contact to start a conversation")}</div>
        ) : (
          <>
            <div className="head"><span className="cav" style={{ width: 32, height: 32, fontSize: 13 }}>{active.displayName.charAt(0)}</span>{active.displayName}</div>
            <div ref={listRef} className="chat-msgs">
              {messages.map((m) => (
                <div key={m.id} className={`bubble ${m.senderId === myId ? "me" : "them"}`}>{m.text}</div>
              ))}
            </div>
            <form onSubmit={send} className="composer">
              <input className="control" value={text} onChange={(e) => setText(e.target.value)} placeholder={t("დაწერე შეტყობინება...", "Type a message...")} />
              <button className="btn btn-primary" aria-label="გაგზავნა"><Send size={18} /></button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
