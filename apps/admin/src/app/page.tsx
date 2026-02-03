export default function AdminDashboard() {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-white">
        <div className="p-6">
          <h1 className="text-xl font-bold text-gray-900">복지메이트</h1>
          <p className="text-sm text-gray-500">관리자</p>
        </div>
        <nav className="px-4">
          {[
            { icon: "📊", label: "대시보드", active: true },
            { icon: "📁", label: "데이터 관리", active: false },
            { icon: "✨", label: "큐레이션", active: false },
            { icon: "🤖", label: "AI 설정", active: false },
            { icon: "📈", label: "통계", active: false },
            { icon: "💰", label: "수익화", active: false },
            { icon: "⚙️", label: "설정", active: false },
          ].map((item) => (
            <button
              key={item.label}
              className={`mb-1 flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm ${
                item.active
                  ? "bg-blue-50 font-medium text-blue-600"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        <h2 className="mb-6 text-2xl font-bold text-gray-900">대시보드</h2>

        {/* Stats Grid */}
        <div className="mb-8 grid grid-cols-4 gap-4">
          {[
            { label: "전체 복지 데이터", value: "2,847", change: "+12" },
            { label: "오늘 방문자", value: "1,234", change: "+8%" },
            { label: "AI 상담", value: "892", change: "+15%" },
            { label: "마지막 수집", value: "03:00", change: "성공" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border bg-white p-5 shadow-sm"
            >
              <p className="text-sm text-gray-500">{stat.label}</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {stat.value}
              </p>
              <p className="mt-1 text-sm text-green-500">{stat.change}</p>
            </div>
          ))}
        </div>

        {/* Recent Activity */}
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h3 className="mb-4 font-semibold text-gray-900">최근 활동</h3>
          <div className="space-y-3">
            {[
              { time: "03:00", text: "데이터 수집 완료 (12건 업데이트)" },
              { time: "어제", text: "배너 설정 변경" },
              { time: "2일 전", text: "AI 프롬프트 수정" },
            ].map((activity, i) => (
              <div
                key={i}
                className="flex items-center gap-4 text-sm text-gray-600"
              >
                <span className="w-16 text-gray-400">{activity.time}</span>
                <span>{activity.text}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
