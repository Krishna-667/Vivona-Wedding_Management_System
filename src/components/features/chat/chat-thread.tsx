"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { sendMessageAction } from "@/app/actions/employee";

interface MessageItem {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
  profiles?: {
    full_name: string;
    role: string;
  } | null;
}

interface ChatThreadProps {
  weddingId: string;
  weddingCode: string;
  weddingTitle: string;
  initialMessages: MessageItem[];
  currentUserId: string;
  currentRole: "admin" | "employee" | "client";
}

export function ChatThread({
  weddingId,
  weddingCode,
  weddingTitle,
  initialMessages,
  currentUserId,
  currentRole,
}: ChatThreadProps) {
  const router = useRouter();
  const [messages, setMessages] = React.useState<MessageItem[]>(initialMessages);
  const [text, setText] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // Sync initialMessages when updated via router.refresh()
  React.useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  // Auto scroll to bottom
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Server-Sent Events subscription (PostgreSQL LISTEN/NOTIFY)
  React.useEffect(() => {
    if (!weddingId || weddingId === "00000000-0000-0000-0000-000000000000") return;

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(`/api/sse/${weddingId}`);

      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.table === "messages") {
            router.refresh();
          }
        } catch {
          // heartbeat or unparseable
        }
      };
    } catch {
      // EventSource fallback
    }

    return () => {
      eventSource?.close();
    };
  }, [weddingId, router]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    const messageText = text.trim();
    setText("");
    setSending(true);

    const res = await sendMessageAction(weddingId, messageText);
    setSending(false);

    if (!res.ok) {
      toast.error(res.error || "Failed to send message.");
      setText(messageText); // restore
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm flex flex-col h-[650px] overflow-hidden">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-border/80 flex items-center justify-between bg-ivory-100/50">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-maroon bg-maroon/10 px-2 py-0.5 rounded">
              {weddingCode}
            </span>
            <span className="text-xs font-semibold uppercase text-gold-600">
              Live Client & Planner Channel
            </span>
          </div>
          <h2 className="font-serif text-lg font-semibold text-charcoal mt-1">
            {weddingTitle}
          </h2>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-sage-700 bg-sage-50 px-2.5 py-1 rounded-full border border-sage-200">
          <span className="w-2 h-2 rounded-full bg-sage-500 animate-pulse" />
          <span>Realtime Synced</span>
        </div>
      </div>

      {/* Message History Area */}
      <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-charcoal/50">
            No messages yet. Send a message to initiate collaboration between couple and the operations team.
          </div>
        ) : (
          messages.map((m) => {
            const isMe = m.sender_id === currentUserId;
            const isClient = m.profiles?.role === "client";

            return (
              <div
                key={m.id}
                className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
              >
                <div className="flex items-center gap-2 mb-1 text-[11px] text-charcoal/60 px-1">
                  <span className="font-semibold text-charcoal">
                    {isMe ? "You" : m.profiles?.full_name || "Team Member"}
                  </span>
                  <span
                    className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded ${
                      isClient
                        ? "bg-gold-100 text-gold-800"
                        : "bg-maroon/10 text-maroon"
                    }`}
                  >
                    {isClient ? "Couple" : "Vivona Planner"}
                  </span>
                  <span>·</span>
                  <span className="font-mono">
                    {new Date(m.created_at).toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                <div
                  className={`max-w-md sm:max-w-lg rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-2xs ${
                    isMe
                      ? "bg-maroon text-ivory rounded-tr-xs"
                      : "bg-ivory-200 text-charcoal rounded-tl-xs border border-border/80"
                  }`}
                >
                  {m.body}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Form */}
      <form
        onSubmit={handleSend}
        className="p-3 sm:p-4 border-t border-border/80 bg-background flex items-center gap-2"
      >
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type your message to the wedding operations team..."
          className="flex-1 rounded-xl border border-input bg-card px-4 py-2.5 text-xs text-foreground placeholder:text-charcoal/40 focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          className="rounded-xl bg-maroon text-ivory px-5 py-2.5 text-xs font-semibold hover:bg-maroon-600 disabled:opacity-50 transition-colors shadow-xs"
        >
          {sending ? "Sending..." : "Send"}
        </button>
      </form>
    </div>
  );
}
