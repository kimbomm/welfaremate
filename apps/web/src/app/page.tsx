export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-white px-5 py-4">
        <h1 className="text-xl font-bold text-gray-900">복지메이트</h1>
      </header>

      {/* Content */}
      <div className="flex-1 px-5 py-6">
        {/* Welcome */}
        <section className="mb-8">
          <p className="text-gray-500">안녕하세요 👋</p>
          <h2 className="mt-1 text-2xl font-bold text-gray-900">
            오늘의 맞춤 혜택을 확인하세요
          </h2>
        </section>

        {/* Cards Placeholder */}
        <section className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-transform active:scale-[0.98]"
            >
              <div className="mb-3 flex items-center gap-2">
                <span className="rounded-lg bg-blue-50 px-2 py-1 text-sm text-blue-600">
                  주거
                </span>
                <span className="text-sm text-orange-500">D-7</span>
              </div>
              <h3 className="mb-1 text-lg font-semibold text-gray-900">
                청년 월세 지원
              </h3>
              <p className="text-gray-500">월 최대 20만원 · 최대 12개월</p>
            </div>
          ))}
        </section>
      </div>

      {/* Bottom Nav */}
      <nav className="sticky bottom-0 border-t bg-white">
        <div className="flex justify-around py-3">
          {[
            { icon: "🏠", label: "홈", active: true },
            { icon: "🔍", label: "검색", active: false },
            { icon: "💬", label: "상담", active: false },
            { icon: "❤️", label: "저장", active: false },
          ].map((item) => (
            <button
              key={item.label}
              className={`flex flex-col items-center gap-1 ${
                item.active ? "text-blue-600" : "text-gray-400"
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-xs">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </main>
  );
}
