export default function LiquidityAnalysis() {
  return (
    <div className="dashboard-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">التحليل</p>
          <h1>تحليل السيولة</h1>
        </div>
        <div className="topbar-actions">
          <div className="date-pill">نظرة عامة</div>
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

      <section className="hero-card">
        <div>
          <p className="eyebrow">الصفحة</p>
          <h2>مراجعة السيولة الحالية</h2>
          <p className="hero-text">
            ستظهر هنا نظرة شاملة على التدفقات النقدية والاحتياطي والقدرة على الوفاء بالالتزامات.
          </p>
        </div>
      </section>

      <section className="dashboard-grid">
        <article className="card">
          <div className="card-header">
            <div>
              <p className="eyebrow">المؤشرات</p>
              <h3>ملخص السيولة</h3>
            </div>
          </div>
          <p className="hero-text">سيتم عرض مؤشرات السيولة الأساسية في هذه المنطقة لاحقًا.</p>
        </article>

        <article className="card">
          <div className="card-header">
            <div>
              <p className="eyebrow">التحليل</p>
              <h3>التدفقات المتوقعة</h3>
            </div>
          </div>
          <p className="hero-text">ستظهر هنا التفاصيل المتعلقة بالتدفقات الواردة والصادرة.</p>
        </article>
      </section>
    </div>
  );
}
