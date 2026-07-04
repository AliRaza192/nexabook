"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, X, Send, Bot, User, Loader2, Sparkles } from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTED_PROMPTS = [
  { label: "Revenue", message: "What's my revenue this month?" },
  { label: "Pending Invoices", message: "Show pending invoices" },
  { label: "Top Products", message: "What are my top selling products?" },
  { label: "Cash Position", message: "What's my cash position?" },
  { label: "Tax Summary", message: "How much tax do I owe?" },
  { label: "Payroll", message: "Show payroll summary" },
];

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load history from DB on mount
  useEffect(() => {
    if (open && !historyLoaded) {
      fetch("/api/chat/history")
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.data?.length > 0) {
            setMessages(data.data);
          } else {
            setMessages([
              {
                role: "assistant",
                content: "Assalam-o-Alaikum! I'm NexaBot. Ask me about your sales, pending invoices, cash position, or any accounting data.",
              },
            ]);
          }
          setHistoryLoaded(true);
        })
        .catch(() => {
          setMessages([
            {
              role: "assistant",
              content: "Assalam-o-Alaikum! I'm NexaBot. Ask me about your sales, pending invoices, cash position, or any accounting data.",
            },
          ]);
          setHistoryLoaded(true);
        });
    }
  }, [open, historyLoaded]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: messageText }]);
    setLoading(true);

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageText, history }),
      });

      const data = await res.json();

      if (data.success) {
        if (data.answer) {
          setMessages((prev) => [...prev, { role: "assistant", content: data.answer }]);
        } else if (data.warning) {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: `⚠️ ${data.warning}\n\nBut here's your data:\n\n${data.data?.join("\n\n") || ""}` },
          ]);
        } else {
          setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I couldn't process that." }]);
        }
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: data.error || "Something went wrong." }]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Network error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const showSuggestions = messages.length <= 1;

  return (
    <>
      {/* Toggle Button */}
      <Button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </Button>

      {/* Chat Panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 h-[500px] bg-white rounded-xl shadow-2xl border flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-blue-600 text-white px-4 py-3 flex items-center gap-2">
            <Bot className="h-5 w-5" />
            <span className="font-semibold">NexaBot</span>
            <span className="text-xs opacity-70 ml-auto">AI Assistant</span>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : ""}`}>
                {msg.role === "assistant" && (
                  <div className="h-7 w-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="h-4 w-4 text-blue-600" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-900"
                  }`}
                >
                  {msg.content}
                </div>
                {msg.role === "user" && (
                  <div className="h-7 w-7 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-1">
                    <User className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-2">
                <div className="h-7 w-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 text-blue-600" />
                </div>
                <div className="bg-slate-100 rounded-lg px-3 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggested Prompts */}
          {showSuggestions && (
            <div className="px-3 pb-2">
              <div className="flex items-center gap-1 mb-2">
                <Sparkles className="h-3 w-3 text-blue-500" />
                <span className="text-xs text-slate-500">Quick actions</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <Button
                    key={prompt.label}
                    variant="outline"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => handleSend(prompt.message)}
                  >
                    {prompt.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="border-t p-3 flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your business..."
              disabled={loading}
              className="flex-1"
            />
            <Button onClick={() => handleSend()} disabled={loading || !input.trim()} size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
