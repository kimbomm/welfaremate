"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Send, Loader2 } from "lucide-react";
import { getProfile } from "@/lib/db";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function ChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "안녕하세요! 복지메이트 AI 상담사입니다. 😊\n\n궁금한 복지 혜택이 있으시면 편하게 물어봐 주세요.\n\n예시:\n• 청년 월세 지원 받을 수 있어?\n• 취업 관련 지원금 있어?\n• 임신하면 받을 수 있는 혜택 알려줘",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userAge, setUserAge] = useState<number | undefined>();
  const [userRegion, setUserRegion] = useState<string | undefined>();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadProfile = async () => {
      const profile = await getProfile();
      if (profile) {
        setUserAge(new Date().getFullYear() - profile.birthYear);
        setUserRegion(profile.region.sido);
      }
    };
    loadProfile();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          userAge,
          userRegion,
        }),
      });

      if (!response.ok) throw new Error("API 오류");

      const data = await response.json();

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.content,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "죄송합니다. 일시적인 오류가 발생했어요. 다시 시도해주세요.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-white px-5 py-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1">
            <ChevronLeft className="h-6 w-6 text-gray-600" />
          </button>
          <div>
            <h1 className="font-semibold text-gray-900">AI 복지 상담</h1>
            <p className="text-xs text-gray-500">맞춤 복지 혜택을 찾아드려요</p>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <AnimatePresence mode="popLayout">
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`mb-4 flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  message.role === "user"
                    ? "bg-primary-500 text-white"
                    : "bg-white text-gray-900 shadow-sm"
                }`}
              >
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {message.content}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 flex justify-start"
          >
            <div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-sm">
              <Loader2 className="h-4 w-4 animate-spin text-primary-500" />
              <span className="text-sm text-gray-500">답변 작성 중...</span>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="sticky bottom-0 border-t bg-white p-4"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="궁금한 복지 혜택을 물어보세요"
            className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-500 text-white transition-all active:scale-95 disabled:bg-gray-200 disabled:text-gray-400"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </form>
    </div>
  );
}
