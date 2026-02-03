"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Send, Loader2, Plus, History, Trash2, X } from "lucide-react";
import {
  getProfile,
  getChatSessions,
  getChatMessages,
  createChatSession,
  addChatMessage,
  deleteChatSession,
  updateChatSessionTitle,
  type ChatSession,
} from "@/lib/db";

// [[혜택명|ID]] 형식을 링크로 변환
function parseWelfareLinks(content: string): React.ReactNode[] {
  const regex = /\[\[([^\]|]+)\|([^\]]+)\]\]/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }
    const [, title, id] = match;
    parts.push(
      <Link
        key={`${id}-${match.index}`}
        href={`/welfare/${id}`}
        className="font-medium text-primary-500 underline underline-offset-2 hover:text-primary-600"
      >
        {title}
      </Link>
    );
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [content];
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "안녕하세요! 복지메이트 AI 상담사입니다.\n\n궁금한 복지 혜택이 있으시면 편하게 물어봐 주세요.\n\n예시:\n- 청년 월세 지원 받을 수 있어?\n- 취업 관련 지원금 있어?\n- 임신하면 받을 수 있는 혜택 알려줘",
  timestamp: new Date(),
};

function ChatContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionIdParam = searchParams.get("session");

  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userAge, setUserAge] = useState<number | undefined>();
  const [userRegion, setUserRegion] = useState<string | undefined>();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 프로필 로드
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

  // 세션 목록 로드
  useEffect(() => {
    const loadSessions = async () => {
      const allSessions = await getChatSessions();
      setSessions(allSessions);
    };
    loadSessions();
  }, [sessionId]);

  // URL 파라미터로 세션 로드
  useEffect(() => {
    const loadSession = async () => {
      if (sessionIdParam) {
        const chatMessages = await getChatMessages(sessionIdParam);
        if (chatMessages.length > 0) {
          setSessionId(sessionIdParam);
          setMessages([
            WELCOME_MESSAGE,
            ...chatMessages.map((m) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              timestamp: new Date(m.createdAt),
            })),
          ]);
        }
      }
    };
    loadSession();
  }, [sessionIdParam]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleNewChat = () => {
    setSessionId(null);
    setMessages([WELCOME_MESSAGE]);
    setShowHistory(false);
    router.push("/chat");
  };

  const handleSelectSession = async (id: string) => {
    const chatMessages = await getChatMessages(id);
    setSessionId(id);
    setMessages([
      WELCOME_MESSAGE,
      ...chatMessages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: new Date(m.createdAt),
      })),
    ]);
    setShowHistory(false);
    router.push(`/chat?session=${id}`);
  };

  const handleDeleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteChatSession(id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (sessionId === id) {
      handleNewChat();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userContent = input.trim();

    // 세션 생성 (첫 메시지일 때)
    let currentSessionId = sessionId;
    if (!currentSessionId) {
      currentSessionId = await createChatSession(userContent.slice(0, 30));
      setSessionId(currentSessionId);
      router.push(`/chat?session=${currentSessionId}`);
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: userContent,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // DB에 사용자 메시지 저장
    await addChatMessage(currentSessionId, "user", userContent);

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

      // DB에 AI 응답 저장
      await addChatMessage(currentSessionId, "assistant", data.content);

      // 첫 대화면 제목 업데이트
      if (messages.length === 1) {
        await updateChatSessionTitle(currentSessionId, userContent.slice(0, 30));
      }
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "죄송합니다. 일시적인 오류가 발생했어요. 다시 시도해주세요.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-white px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
          <button onClick={() => router.push("/")} className="p-1">
            <ChevronLeft className="h-6 w-6 text-gray-600" />
          </button>
            <div>
              <h1 className="font-semibold text-gray-900">AI 복지 상담</h1>
              <p className="text-xs text-gray-500">맞춤 복지 혜택을 찾아드려요</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
            >
              <History className="h-5 w-5" />
            </button>
            <button
              onClick={handleNewChat}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* History Panel */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-b bg-white"
          >
            <div className="max-h-64 overflow-y-auto p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">이전 상담</span>
                <button onClick={() => setShowHistory(false)}>
                  <X className="h-4 w-4 text-gray-400" />
                </button>
              </div>
              {sessions.length === 0 ? (
                <p className="py-4 text-center text-sm text-gray-400">
                  이전 상담 내역이 없습니다
                </p>
              ) : (
                <div className="space-y-2">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      onClick={() => handleSelectSession(session.id)}
                      className={`flex cursor-pointer items-center justify-between rounded-lg p-3 transition-colors hover:bg-gray-50 ${
                        sessionId === session.id ? "bg-primary-50" : ""
                      }`}
                    >
                      <div className="flex-1 overflow-hidden">
                        <p className="truncate text-sm font-medium text-gray-900">
                          {session.title}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(session.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={(e) => handleDeleteSession(session.id, e)}
                        className="ml-2 rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
                  {message.role === "assistant"
                    ? parseWelfareLinks(message.content)
                    : message.content}
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

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
        </div>
      }
    >
      <ChatContent />
    </Suspense>
  );
}
