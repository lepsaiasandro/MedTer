import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import * as signalR from "@microsoft/signalr";
import api, { API_BASE } from "../api";
import { useAuth } from "../auth";
import { usePrefs } from "../i18n";
import { ArrowLeft, Plus, Search, Send, Users, X } from "../components/icons";

interface ChatGroup {
  id: number;
  announcementId: number;
  name: string;
  announcementType?: string;
  city?: string;
  memberCount: number;
  lastMessageAt?: string | null;
  lastMessagePreview?: string | null;
  unreadCount: number;
  isOwner: boolean;
}

interface GroupMessage {
  id: number;
  groupId: number;
  senderId: string;
  senderName: string;
  text: string;
  sentAt: string;
}

interface GroupMember {
  userId: string;
  displayName: string;
  role: string;
  city?: string;
}

interface CreatableAnnouncement {
  id: number;
  title: string;
  type?: string;
  interestedCount: number;
}

const RECENT_KEY = "medter_group_recent";
const MAX_RECENT = 8;

const sortByRecent = (list: ChatGroup[]) =>
  [...list].sort((a, b) => new Date(b.lastMessageAt ?? 0).getTime() - new Date(a.lastMessageAt ?? 0).getTime());

const loadRecentIds = (): number[] => {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is number => typeof x === "number") : [];
  } catch {
    return [];
  }
};

const saveRecentIds = (ids: number[]) => {
  localStorage.setItem(RECENT_KEY, JSON.stringify(ids.slice(0, MAX_RECENT)));
};

export default function Chat() {
  const { user } = useAuth();
  const { t } = usePrefs();
  const location = useLocation();
  const preselectId = (location.state as { groupId?: number } | null)?.groupId ?? null;

  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [active, setActive] = useState<ChatGroup | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [showMembers, setShowMembers] = useState(false);
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [recentIds, setRecentIds] = useState<number[]>(loadRecentIds);
  const [createOpen, setCreateOpen] = useState(false);
  const [creatable, setCreatable] = useState<CreatableAnnouncement[]>([]);
  const [creating, setCreating] = useState(false);

  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const activeRef = useRef<ChatGroup | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  activeRef.current = active;
  const myId = user?.userId;
  const isCenter = user?.role === "TrainingCenter";
  const q = query.trim().toLowerCase();

  const loadGroups = async (selectId?: number | null) => {
    const { data } = await api.get<ChatGroup[]>("/chat/groups");
    const sorted = sortByRecent(data);
    setGroups(sorted);
    const conn = connectionRef.current;
    if (conn?.state === signalR.HubConnectionState.Connected) {
      for (const g of sorted) conn.invoke("JoinGroup", g.id).catch(() => {});
    }
    const pick = selectId != null ? sorted.find((g) => g.id === selectId) : null;
    if (pick) setActive(pick);
    else if (preselectId != null) {
      const pre = sorted.find((g) => g.id === preselectId);
      if (pre) setActive(pre);
    }
  };

  useEffect(() => {
    loadGroups().catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_BASE}/hubs/chat`, { accessTokenFactory: () => localStorage.getItem("token") ?? "" })
      .withAutomaticReconnect()
      .build();

    connection.on("ReceiveGroupMessage", (msg: GroupMessage) => {
      const current = activeRef.current;
      const inActive = !!current && msg.groupId === current.id;
      const incoming = msg.senderId !== myId;

      if (inActive) setMessages((prev) => [...prev, msg]);
      if (inActive && incoming) api.post(`/chat/groups/${msg.groupId}/read`).catch(() => {});

      setGroups((prev) =>
        sortByRecent(prev.map((g) =>
          g.id === msg.groupId
            ? {
                ...g,
                lastMessageAt: msg.sentAt,
                lastMessagePreview: msg.text,
                unreadCount: incoming && !inActive ? (g.unreadCount ?? 0) + 1 : g.unreadCount,
              }
            : g
        ))
      );
    });

    connection.start()
      .then(() => loadGroups().catch(console.error))
      .catch(console.error);
    connectionRef.current = connection;
    return () => { connection.stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myId]);

  useEffect(() => {
    if (!active) return;
    api.get<GroupMessage[]>(`/chat/groups/${active.id}/messages`).then((r) => setMessages(r.data));
    api.get<GroupMember[]>(`/chat/groups/${active.id}/members`).then((r) => setMembers(r.data));
    connectionRef.current?.invoke("JoinGroup", active.id).catch(() => {});
    setGroups((prev) => prev.map((g) => (g.id === active.id ? { ...g, unreadCount: 0 } : g)));
    setShowMembers(false);
  }, [active]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const pushRecent = (id: number) => {
    setRecentIds((prev) => {
      const next = [id, ...prev.filter((x) => x !== id)].slice(0, MAX_RECENT);
      saveRecentIds(next);
      return next;
    });
  };

  const removeRecent = (id: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setRecentIds((prev) => {
      const next = prev.filter((x) => x !== id);
      saveRecentIds(next);
      return next;
    });
  };

  const clearRecent = () => {
    setRecentIds([]);
    saveRecentIds([]);
  };

  const selectGroup = (g: ChatGroup) => {
    setActive(g);
    pushRecent(g.id);
    setQuery("");
    setSearching(false);
    searchInputRef.current?.blur();
  };

  const cancelSearch = () => {
    setQuery("");
    setSearching(false);
    searchInputRef.current?.blur();
  };

  const openCreate = async () => {
    const { data } = await api.get<CreatableAnnouncement[]>("/chat/groups/creatable");
    setCreatable(data);
    setCreateOpen(true);
  };

  const createGroup = async (announcementId: number) => {
    setCreating(true);
    try {
      const { data } = await api.post<ChatGroup>("/chat/groups", { announcementId });
      setCreateOpen(false);
      await loadGroups(data.id);
      connectionRef.current?.invoke("JoinGroup", data.id).catch(() => {});
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg || t("ჯგუფის შექმნა ვერ მოხერხდა", "Could not create group"));
    } finally {
      setCreating(false);
    }
  };

  const filtered = useMemo(
    () => (q
      ? groups.filter((g) => `${g.name} ${g.city ?? ""} ${g.announcementType ?? ""}`.toLowerCase().includes(q))
      : groups),
    [groups, q]
  );

  const recentGroups = useMemo(() => {
    const map = new Map(groups.map((g) => [g.id, g]));
    return recentIds.map((id) => map.get(id)).filter((g): g is ChatGroup => !!g);
  }, [groups, recentIds]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !active) return;
    await connectionRef.current?.invoke("SendGroupMessage", active.id, text.trim());
    setText("");
  };

  const meta = (g: ChatGroup) => {
    const parts = [
      g.announcementType || t("ტრენინგი", "Training"),
      g.city,
      `${g.memberCount} ${t("წევრი", "members")}`,
    ].filter(Boolean);
    return parts.join(" · ");
  };

  const renderGroup = (g: ChatGroup, opts?: { showRemove?: boolean }) => {
    const unread = g.unreadCount ?? 0;
    return (
      <div
        key={g.id}
        role="button"
        tabIndex={0}
        onClick={() => selectGroup(g)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectGroup(g); } }}
        className={`contact ${active?.id === g.id ? "active" : ""}`}
      >
        <span className="cav group-av"><Users size={16} /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className={`cname ${unread > 0 ? "unread" : ""}`} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {g.name}
          </div>
          <div className="crole" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {g.lastMessagePreview || meta(g)}
          </div>
        </div>
        {unread > 0 && <span className="cbadge">{unread > 9 ? "9+" : unread}</span>}
        {opts?.showRemove && (
          <button type="button" className="cremove" aria-label={t("წაშლა", "Remove")} onClick={(e) => removeRecent(g.id, e)}>
            <X size={14} />
          </button>
        )}
      </div>
    );
  };

  const showSearchPanel = searching || q.length > 0;

  return (
    <div className={`chat${active ? " show-thread" : ""}`}>
      <div className="chat-aside">
        <div className="head" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <span>{t("ჯგუფები", "Groups")}</span>
          {isCenter && (
            <button type="button" className="btn btn-primary btn-sm" onClick={openCreate} title={t("ჯგუფის შექმნა", "Create group")}>
              <Plus size={14} /> {t("ახალი", "New")}
            </button>
          )}
        </div>

        <div className={`contact-search ${searching ? "focused" : ""}`}>
          <div className="contact-search-bar">
            <Search size={15} />
            <input
              ref={searchInputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setSearching(true)}
              placeholder={t("ძებნა", "Search")}
              aria-label={t("ჯგუფების ძებნა", "Search groups")}
            />
            {query && (
              <button type="button" className="contact-search-clear" onClick={() => setQuery("")} aria-label={t("გასუფთავება", "Clear")}>
                <X size={14} />
              </button>
            )}
          </div>
          {showSearchPanel && (
            <button type="button" className="contact-search-cancel" onClick={cancelSearch}>
              {t("გაუქმება", "Cancel")}
            </button>
          )}
        </div>

        <div className="chat-list">
          {groups.length === 0 && (
            <p className="contact-empty">
              {isCenter
                ? t("ჯგუფები ჯერ არ გაქვს — შექმენი ტრენინგისთვის", "No groups yet — create one for a training")
                : t("ჯგუფები ჯერ არ არის", "No groups yet")}
            </p>
          )}

          {groups.length > 0 && showSearchPanel && q && (
            <>
              {filtered.length === 0 ? (
                <p className="contact-empty">{t("შედეგი ვერ მოიძებნა", "No results found")}</p>
              ) : (
                <>
                  <div className="contact-section-label">{t("შედეგები", "Results")}</div>
                  {filtered.map((g) => renderGroup(g))}
                </>
              )}
            </>
          )}

          {groups.length > 0 && showSearchPanel && !q && (
            <>
              {recentGroups.length > 0 && (
                <>
                  <div className="contact-section-head">
                    <span>{t("ბოლო", "Recent")}</span>
                    <button type="button" className="contact-clear-all" onClick={clearRecent}>
                      {t("ყველას გასუფთავება", "Clear all")}
                    </button>
                  </div>
                  {recentGroups.map((g) => renderGroup(g, { showRemove: true }))}
                </>
              )}
              <div className="contact-section-label">{t("ყველა ჯგუფი", "All groups")}</div>
              {groups.map((g) => renderGroup(g))}
            </>
          )}

          {groups.length > 0 && !showSearchPanel && groups.map((g) => renderGroup(g))}
        </div>
      </div>

      <div className="chat-main">
        {!active ? (
          <div className="chat-empty">{t("აირჩიე ჯგუფი მიმოწერის დასაწყებად", "Select a group to start chatting")}</div>
        ) : (
          <>
            <div className="head">
              <button
                type="button"
                className="chat-back"
                aria-label={t("უკან", "Back")}
                onClick={() => setActive(null)}
              >
                <ArrowLeft size={18} />
              </button>
              <span className="cav group-av" style={{ width: 32, height: 32 }}><Users size={14} /></span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{active.name}</div>
                <div className="crole" style={{ fontWeight: 500 }}>{meta(active)}</div>
              </div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowMembers((v) => !v)}>
                <Users size={14} /> {t("წევრები", "Members")}
              </button>
            </div>

            {showMembers && (
              <div className="group-members">
                {members.map((m) => (
                  <div key={m.userId} className="group-member">
                    <span className="cav" style={{ width: 28, height: 28, fontSize: 12 }}>{m.displayName.charAt(0)}</span>
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

            <div ref={listRef} className="chat-msgs">
              {messages.length === 0 && (
                <p className="contact-empty" style={{ margin: "auto" }}>{t("ჯერ შეტყობინებები არ არის", "No messages yet")}</p>
              )}
              {messages.map((m) => (
                <div key={m.id} className={`bubble ${m.senderId === myId ? "me" : "them"}`}>
                  {m.senderId !== myId && <div className="bubble-name">{m.senderName}</div>}
                  {m.text}
                </div>
              ))}
            </div>
            <form onSubmit={send} className="composer">
              <input className="control" value={text} onChange={(e) => setText(e.target.value)} placeholder={t("დაწერე შეტყობინება...", "Type a message...")} />
              <button className="btn btn-primary" aria-label="გაგზავნა"><Send size={18} /></button>
            </form>
          </>
        )}
      </div>

      {createOpen && (
        <div className="modal" onClick={() => !creating && setCreateOpen(false)}>
          <div className="box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="mhead">
              <div>
                <h3>{t("ტრენინგის ჯგუფის შექმნა", "Create training group")}</h3>
                <p>{t("დარეგისტრირებული ექიმები ავტომატურად დაემატებიან", "Registered doctors will be added automatically")}</p>
              </div>
              <button className="xbtn" onClick={() => setCreateOpen(false)}>×</button>
            </div>
            {creatable.length === 0 ? (
              <p className="contact-empty">{t("ყველა ტრენინგს უკვე აქვს ჯგუფი, ან გამოქვეყნებული ტრენინგი არ გაქვს", "All trainings already have a group, or you have no published trainings")}</p>
            ) : (
              <div>
                {creatable.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    className="contact"
                    disabled={creating}
                    onClick={() => createGroup(a.id)}
                  >
                    <span className="cav group-av"><Users size={16} /></span>
                    <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                      <div className="cname">{a.title}</div>
                      <div className="crole">
                        {a.type || t("ტრენინგი", "Training")} · {a.interestedCount} {t("რეგისტრირებული", "registered")}
                      </div>
                    </div>
                    <Plus size={16} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
