import Dexie, { type EntityTable } from "dexie";

// User Profile 타입
export interface UserProfile {
  id: string;
  createdAt: string;
  updatedAt: string;
  birthYear: number;
  region: {
    sido: string;
    sigungu?: string;
  };
  employment: "employed" | "self-employed" | "unemployed" | "student" | "other";
  incomeLevel: "low" | "medium" | "high";
  annualIncome?: number;
  householdSize?: number;
  householdType: "single" | "married" | "with-parents" | "other";
  hasChildren: boolean;
  childrenAges?: number[];
  housingType: "rent" | "jeonse" | "own" | "with-parents" | "other";
  isHouseless: boolean;
  isDisabled: boolean;
  isVeteran: boolean;
  isMulticultural: boolean;
  isSingleParent: boolean;
}

// Bookmark 타입
export interface Bookmark {
  id: string;
  welfareId: string;
  createdAt: string;
  memo?: string;
}

// Chat 타입
export interface ChatMessage {
  id: string;
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

// Dexie 데이터베이스 정의
const db = new Dexie("WelfareMateDB") as Dexie & {
  profiles: EntityTable<UserProfile, "id">;
  bookmarks: EntityTable<Bookmark, "id">;
  chatSessions: EntityTable<ChatSession, "id">;
  chatMessages: EntityTable<ChatMessage, "id">;
};

db.version(2).stores({
  profiles: "id, createdAt",
  bookmarks: "id, welfareId, createdAt",
  chatSessions: "id, createdAt, updatedAt",
  chatMessages: "id, sessionId, createdAt",
});

export { db };

// Profile 헬퍼 함수
export async function getProfile(): Promise<UserProfile | undefined> {
  const profiles = await db.profiles.toArray();
  return profiles[0];
}

export async function saveProfile(
  profile: Omit<UserProfile, "id" | "createdAt" | "updatedAt">
): Promise<void> {
  const existing = await getProfile();
  const now = new Date().toISOString();

  if (existing) {
    await db.profiles.update(existing.id, {
      ...profile,
      updatedAt: now,
    });
  } else {
    await db.profiles.add({
      ...profile,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    });
  }
}

export async function hasProfile(): Promise<boolean> {
  const count = await db.profiles.count();
  return count > 0;
}

// Bookmark 헬퍼 함수
export async function getBookmarks(): Promise<Bookmark[]> {
  return db.bookmarks.orderBy("createdAt").reverse().toArray();
}

export async function addBookmark(welfareId: string): Promise<void> {
  await db.bookmarks.add({
    id: crypto.randomUUID(),
    welfareId,
    createdAt: new Date().toISOString(),
  });
}

export async function removeBookmark(welfareId: string): Promise<void> {
  await db.bookmarks.where("welfareId").equals(welfareId).delete();
}

export async function isBookmarked(welfareId: string): Promise<boolean> {
  const count = await db.bookmarks.where("welfareId").equals(welfareId).count();
  return count > 0;
}

// Chat 헬퍼 함수
export async function getChatSessions(): Promise<ChatSession[]> {
  return db.chatSessions.orderBy("updatedAt").reverse().toArray();
}

export async function getChatSession(sessionId: string): Promise<ChatSession | undefined> {
  return db.chatSessions.get(sessionId);
}

export async function createChatSession(title: string = "새 상담"): Promise<string> {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  await db.chatSessions.add({
    id,
    title,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

export async function updateChatSessionTitle(sessionId: string, title: string): Promise<void> {
  await db.chatSessions.update(sessionId, {
    title,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteChatSession(sessionId: string): Promise<void> {
  await db.chatMessages.where("sessionId").equals(sessionId).delete();
  await db.chatSessions.delete(sessionId);
}

export async function getChatMessages(sessionId: string): Promise<ChatMessage[]> {
  return db.chatMessages.where("sessionId").equals(sessionId).sortBy("createdAt");
}

export async function addChatMessage(
  sessionId: string,
  role: "user" | "assistant",
  content: string
): Promise<void> {
  await db.chatMessages.add({
    id: crypto.randomUUID(),
    sessionId,
    role,
    content,
    createdAt: new Date().toISOString(),
  });
  // 세션 업데이트 시간 갱신
  await db.chatSessions.update(sessionId, {
    updatedAt: new Date().toISOString(),
  });
}
