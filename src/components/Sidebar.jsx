import PulseChart from "./PulseChart";

export default function Sidebar({ activePage, onSelect, financialState, onLogout }) {
  const menu = [
    { label: "لوحة التحكم", value: "Dashboard", icon: "◈" },
    { label: "تحليل السيولة", value: "Liquidity Analysis", icon: "◌" },
    { label: "الفواتير", value: "Invoices", icon: "◍" },
    { label: "توصيات AI", value: "AI Recommendations", icon: "✦" },
    { label: "التمويل", value: "Funding", icon: "◐" },
    { label: "مصدر البيانات", value: "Data Source", icon: "⇄" },
    { label: "الإعدادات", value: "Settings", icon: "⚙" },
  ];

  const forecast = financialState?.forecast || [];
  const week1 = forecast.slice(0, 7);
  const hasDeficit = financialState?.daysUntilDeficit !== null && financialState?.daysUntilDeficit !== undefined;

  const weeklyChangePct =
    week1.length > 0 && financialState?.currentCash
      ? ((week1[week1.length - 1].balance - financialState.currentCash) / Math.abs(financialState.currentCash || 1)) * 100
      : 0;
  const isPositive = weeklyChangePct >= 0;

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-badge">✦</div>
        <div>
          <div className="brand-title">نماء AI</div>
          <div className="brand-subtitle">مستشار السيولة الذكي</div>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="القائمة الجانبية">
        {menu.map((item) => (
          <button
            key={item.value}
            className={`menu-item ${activePage === item.value ? "active" : ""}`}
            onClick={() => onSelect(item.value)}
            type="button"
          >
            <span style={{ display: "flex", alignItems: "center" }}>
              <span className="menu-icon">{item.icon}</span>
              <span>{item.label}</span>
            </span>
            <span className="menu-dot" />
          </button>
        ))}
      </nav>

      <div className="sidebar-card">
        <p className="sidebar-card-title">توقع أسبوعي للنقد</p>
        <p className={`sidebar-card-value ${isPositive ? "positive" : "negative"}`}>
          {isPositive ? "+" : ""}
          {weeklyChangePct.toFixed(1)}%
        </p>
        {week1.length > 1 && (
          <PulseChart data={week1} height={38} showZeroLine={false} deficitDay={hasDeficit && financialState.daysUntilDeficit <= 7 ? financialState.daysUntilDeficit : null} />
        )}
        <p className="sidebar-card-text">
          {hasDeficit ? `تحذير: عجز متوقع خلال ${financialState.daysUntilDeficit} يوم` : "الرصيد النقدي المتوقع لأول أسبوع"}
        </p>
      </div>

      <button
        type="button"
        onClick={onLogout}
        className="ghost-button"
        style={{ marginTop: "12px", width: "100%" }}
      >
        ⏻ تسجيل الخروج
      </button>
    </aside>
  );
}
