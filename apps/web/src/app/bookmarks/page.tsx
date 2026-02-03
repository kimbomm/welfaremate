"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Search, Home, Heart, Trash2 } from "lucide-react";
import { getBookmarks, removeBookmark, type Bookmark } from "@/lib/db";
import { getWelfareById, getCategoryLabel, formatDeadline } from "@welfaremate/data";
import type { WelfareItem } from "@welfaremate/types";

interface BookmarkWithWelfare extends Bookmark {
  welfare?: WelfareItem;
}

export default function BookmarksPage() {
  const router = useRouter();
  const [bookmarks, setBookmarks] = useState<BookmarkWithWelfare[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBookmarks = async () => {
    const savedBookmarks = await getBookmarks();
    const withWelfare = savedBookmarks.map((bookmark) => ({
      ...bookmark,
      welfare: getWelfareById(bookmark.welfareId),
    }));
    setBookmarks(withWelfare);
    setLoading(false);
  };

  useEffect(() => {
    loadBookmarks();
  }, []);

  const handleRemove = async (welfareId: string) => {
    await removeBookmark(welfareId);
    await loadBookmarks();
  };

  return (
    <main className="flex min-h-screen flex-col pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-white px-5 py-4">
        <h1 className="text-xl font-bold text-gray-900">저장한 혜택</h1>
      </header>

      {/* Content */}
      <div className="flex-1 px-5 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
          </div>
        ) : bookmarks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Heart className="mb-4 h-12 w-12 text-gray-200" />
            <p className="text-gray-400">저장한 혜택이 없습니다</p>
            <p className="mt-1 text-sm text-gray-400">
              마음에 드는 혜택을 저장해보세요
            </p>
            <button
              onClick={() => router.push("/search")}
              className="mt-6 rounded-xl bg-primary-500 px-6 py-3 font-medium text-white"
            >
              혜택 둘러보기
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {bookmarks.map((bookmark, index) => {
              if (!bookmark.welfare) return null;

              const welfare = bookmark.welfare;
              const deadline = formatDeadline(welfare.schedule.end);

              return (
                <motion.div
                  key={bookmark.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
                >
                  <div
                    onClick={() => router.push(`/welfare/${welfare.id}`)}
                    className="cursor-pointer"
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <span className="rounded-md bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-600">
                        {getCategoryLabel(welfare.category)}
                      </span>
                      {deadline && (
                        <span className="text-xs text-warning">{deadline}</span>
                      )}
                    </div>
                    <h3 className="font-medium text-gray-900">{welfare.title}</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {welfare.summary.oneLiner}
                    </p>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t pt-3">
                    <span className="text-xs text-gray-400">
                      {new Date(bookmark.createdAt).toLocaleDateString()} 저장
                    </span>
                    <button
                      onClick={() => handleRemove(welfare.id)}
                      className="flex items-center gap-1 text-sm text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                      삭제
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 mx-auto max-w-[720px] border-t bg-white">
        <div className="flex justify-around py-3">
          {[
            { icon: Home, label: "홈", active: false, href: "/" },
            { icon: Search, label: "검색", active: false, href: "/search" },
            { icon: Heart, label: "저장", active: true, href: "/bookmarks" },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => router.push(item.href)}
              className={`flex flex-col items-center gap-1 ${
                item.active ? "text-primary-500" : "text-gray-400"
              }`}
            >
              <item.icon className="h-6 w-6" />
              <span className="text-xs">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </main>
  );
}
