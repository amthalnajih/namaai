import PulseChart from "../components/PulseChart";

function formatCurrency(value) {
  return `${Number(value || 0).toLocaleString("en-SA")} ر.س`;
}

function healthTier(score) {
  if (score >= 70) return "ok";
  if (score >= 40) return "warn";
  return "critical";
}

export default function Dashboard({ financialState }) {
  const today = new Intl.DateTimeFormat("ar-EG", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());

  const currentCash = financialState.currentCash;
  const netCashFlow = financialState.cashFlow;
  const healthScore = financialState.financialHealthScore;
  const cashRunway = financialState.cashRunway;
  const profitMargin = financialState.profitMargin;
  const tier = healthTier(healthScore);

  const kpis = [
    {
      title: "الرصيد المتاح",
      value: formatCurrency(currentCash),
      caption: "السيولة النقدية الحالية",
      accent: "emerald",
    },
    {
      title: "التدفق النقدي",
      value: `${netCashFlow >= 0 ? "+" : ""}${formatCurrency(netCashFlow)}`,
      caption: "صافي شهري",
      accent: "blue",
    },
    {
      title: "هامش الربح",
      value: `${profitMargin.toFixed(1)}%`,
      caption: "من الإيراد الشهري",
      accent: "amber",
    },
    {
      title: "الصحة المالية",
      value: `${healthScore}/100`,
      caption: financialState.liquidityStatus,
      accent: "slate",
    },
  ];

  const invoices = financialState.invoices.slice(0, 4);
  const outstandingCount = financialState.invoices.filter((invoice) => invoice.status !== "مدفوعة").length;
  const overdueCount = financialState.invoices.filter((invoice) => invoice.status === "متأخرة").length;

  const statusClass = { "مدفوعة": "paid", "معلقة": "pending", "متأخرة": "overdue" };

  return (
    <div className="dashboard-shell">
      <header className="topbar">
        <div>
          <h1 className="page-title">لوحة التحكم</h1>
          <p className="eyebrow">مرحبًا بعودتك — إليك أداء {financialState.companyName} لهذا اليوم</p>
        </div>
        <div className="topbar-actions">
          <div className="date-pill">{today}</div>
          <button className="icon-button" aria-label="الإشعارات">🔔</button>
          <div className="profile-chip">
            <div className="avatar">س</div>
            <div>
              <div className="profile-name">محمد الشمري</div>
              <div className="profile-role">الرئيس التنفيذي</div>
            </div>
          </div>
        </div>
      </header>

      {/* هيرو النبض المالي — العنصر المميز بالتصميم، مبني من بيانات التنبؤ الحقيقية */}
      <section className="hero-card vitals-hero">
        <div style={{ width: "100%" }}>
          <div className="vitals-top">
            <div>
              <p className="eyebrow">النبض المالي — تنبؤ 30 يوم</p>
              <div className="vitals-readout">
                <span className={`vitals-score ${tier}`}>{healthScore}</span>
                <span className="vitals-score-max">/ 100</span>
              </div>
            </div>
            <span className={`vitals-status-tag ${tier}`}>
              {financialState.liquidityStatus} · مخاطر {financialState.riskLevel}
            </span>
          </div>

          <div className="vitals-chart-wrap">
            <PulseChart
              data={financialState.forecast}
              height={140}
              deficitDay={financialState.daysUntilDeficit}
            />
          </div>

          {financialState.daysUntilDeficit !== null && financialState.daysUntilDeficit !== undefined ? (
            <div className="vitals-alert">
              ⚠️ النظام يتوقع عجزًا ماليًا خلال <strong>{financialState.daysUntilDeficit} يومًا</strong> (بتاريخ {financialState.deficitDate}) إذا استمر النمط الحالي للتدفق النقدي.
            </div>
          ) : (
            <div className="vitals-ok-banner">
              ✅ لا يوجد عجز متوقع خلال الثلاثين يومًا القادمة بناءً على النمط الحالي.
            </div>
          )}
        </div>
      </section>

      <section className="kpi-grid">
        {kpis.map((item, index) => (
          <article key={item.title} className={`metric-card ${item.accent}`}>
            <p className="metric-title">{item.title}</p>
            <h3 className="metric-value">{item.value}</h3>
            <p className="metric-caption">{item.caption}</p>
            {index === 0 && financialState.forecast?.length > 0 && (
              <div className="metric-spark">
                <PulseChart data={financialState.forecast.slice(0, 14)} height={34} showZeroLine={false} />
              </div>
            )}
          </article>
        ))}
      </section>

      <section className="dashboard-grid">
        <article className="card">
          <div className="card-header">
            <div>
              <p className="eyebrow">التوقع التفصيلي</p>
              <h3>مسار الرصيد النقدي (30 يوم)</h3>
            </div>
            <span className="trend-pill">{financialState.liquidityStatus}</span>
          </div>
          <PulseChart
            data={financialState.forecast}
            height={200}
            deficitDay={financialState.daysUntilDeficit}
          />
        </article>

        <article className="card status-card">
          <div className="card-header">
            <div>
              <p className="eyebrow">حالة السيولة</p>
              <h3>مؤشر الصحة</h3>
            </div>
            <span className="status-pill">{financialState.liquidityStatus}</span>
          </div>
          <div
            className="status-ring"
            style={{
              "--ring-pct": healthScore,
              "--ring-color": tier === "ok" ? "var(--mint)" : tier === "warn" ? "var(--gold)" : "var(--coral)",
            }}
          >
            <div className="ring-inner">{healthScore}</div>
          </div>
          <ul className="status-list">
            <li><span>احتياطي السيولة</span><span>{cashRunway.toFixed(1)} شهر</span></li>
            <li><span>مستوى الخطر</span><span>{financialState.riskLevel}</span></li>
            <li><span>فواتير مستحقة</span><span>{outstandingCount}</span></li>
            <li><span>فواتير متأخرة</span><span>{overdueCount}</span></li>
          </ul>
        </article>
      </section>

      <section className="dashboard-grid lower-grid">
        <article className="card ai-card">
          <div className="card-header">
            <div>
              <p className="eyebrow">توصية AI</p>
              <h3>الخطوة التالية الموصى بها</h3>
            </div>
            <span className="chip">{financialState.aiGenerated ? "✨ Claude" : "مبني على قواعد"}</span>
          </div>
          <p className="ai-copy">{financialState.aiRecommendation}</p>
          <div className="ai-footer">
            <span>مبني على تحليل مباشر لقاعدة البيانات</span>
            <span>يتحدث تلقائيًا</span>
          </div>
        </article>

        <article className="card funding-card">
          <div className="card-header">
            <div>
              <p className="eyebrow">التمويل</p>
              <h3>{financialState.recommendedFunding.fundingType}</h3>
            </div>
            <span className="chip">حديث</span>
          </div>
          <p className="funding-copy">{financialState.recommendedFunding.reason}</p>
          <div className="funding-amount">
            {financialState.recommendedFunding.amount > 0
              ? formatCurrency(financialState.recommendedFunding.amount)
              : "لا يوجد تمويل مطلوب"}
          </div>
        </article>
      </section>

      <section className="card invoice-card">
        <div className="card-header">
          <div>
            <p className="eyebrow">الفواتير الأخيرة</p>
            <h3>سجل المدفوعات</h3>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>رقم الفاتورة</th>
                <th>العميل</th>
                <th>المبلغ</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="mono">{invoice.id}</td>
                  <td>{invoice.customer}</td>
                  <td className="mono">{formatCurrency(invoice.amount)}</td>
                  <td>
                    <span className={`table-status ${statusClass[invoice.status] || ""}`}>{invoice.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
