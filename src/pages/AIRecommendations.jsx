export default function AIRecommendations() {
  return (
    <div className="dashboard-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">توصيات AI</p>
          <h1>توصيات الذكاء الاصطناعي</h1>
        </div>
        <div className="topbar-actions">
          <div className="date-pill">مستجدات</div>
          <button className="icon-button" aria-label="الإشعارات">🔔</button>
          <div className="profile-chip">
            <div className="avatar">س</div>
            <div>
              <div className="profile-name">سارة القحطاني</div>
              <div className="profile-role">مدير المالية</div>
            </div>
          </div>
        </div>
      </header>

      <section className="hero-card">
        <div>
          <p className="eyebrow">الصفحة</p>
          <h2>مركز التوصيات الذكية</h2>
          <p className="hero-text">
            ستظهر هنا اقتراحات مخصصة لتحسين السيولة والقرارات المالية دون أي منطق تشغيلي في هذه المرحلة.
          </p>
        </div>
      </section>

      <section className="dashboard-grid">
        <article className="card">
          <div className="card-header">
            <div>
              <p className="eyebrow">التوصيات</p>
              <h3>الترتيبات المقترحة</h3>
            </div>
          </div>
          <p className="hero-text">سيتوفر هنا قائمة بالتوصيات المستقبلية عند تفعيل المنطق المقابل.</p>
        </article>

        <article className="card">
          <div className="card-header">
            <div>
              <p className="eyebrow">التحليل</p>
              <h3>الملف المالي</h3>
            </div>
          </div>
          <p className="hero-text">سيتم عرض المؤشرات والتفاصيل الإضافية هنا لاحقًا.</p>
        </article>
      </section>
    </div>
  );
}
