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

// Dexie 데이터베이스 정의
const db = new Dexie("WelfareMateDB") as Dexie & {
  profiles: EntityTable<UserProfile, "id">;
  bookmarks: EntityTable<Bookmark, "id">;
};

db.version(1).stores({
  profiles: "id, createdAt",
  bookmarks: "id, welfareId, createdAt",
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
