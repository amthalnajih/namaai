import { useEffect, useState } from "react";
import { apiFetch } from "../api";

function formatCurrency(value) {
  return `${Number(value || 0).toLocaleString("en-SA")} ر.س`;
}

export default function Funding({ financialState }) {
  const selected = financialState.recommendedFunding;
  const healthScore = financialState.financialHealthScore;
  const cashRunway = financialState.cashRunway;
  const profitMargin = financialState.profitMargin;
  const overdue = financialState.overdueInvoices;

  const [requests, setRequests] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  const [error, setError] = useState(null);

  const loadRequests = () => {
    apiFetch("/funding/requests")
      .then((res) => res.json())
      .then(setRequests)
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleRequest = async () => {
    setSubmitting(true);
    setError(null);
    setConfirmation(null);
    try {
      const res = await apiFetch("/funding/request", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "تعذر تسجيل الطلب");
        return;
      }
      setConfirmation(data);
      loadRequests();
    } catch (err) {
      console.error(err);
      setError("تعذر الاتصال بالخادم");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="dashboard-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">التمويل</p>
          <h1 className="page-title">التمويل والاستراتيجيات</h1>
        </div>
        <div className="topbar-actions">
          <div className="date-pill">الخيارات المتاحة</div>
        </div>
      </header>

      <section className="hero-card">
        <div>
          <p className="eyebrow">قرار التمويل الذكي</p>
          <h2 className="section-title">{selected.fundingType}</h2>
          <p className="hero-text">
            التوصية تُبنى تلقائيًا من محرك التحليل بناءً على السيولة، التدفق النقدي، الفواتير المتأخرة، الربحية، والصحة المالية.
          </p>
        </div>
        <div className="hero-badge">المؤشر {healthScore}/100</div>
      </section>

      <section className="dashboard-grid">
        <article className="card">
          <div className="card-header">
            <div>
              <p className="eyebrow">الخطة المقترحة</p>
              <h3>سبب التوصية</h3>
            </div>
          </div>
          <p className="hero-text">{selected.reason}</p>
          <ul className="status-list" style={{ marginTop: "16px" }}>
            <li><span>الصحة المالية</span><span>{healthScore}/100</span></li>
            <li><span>التدفق النقدي</span><span>{formatCurrency(financialState.cashFlow)}</span></li>
            <li><span>احتياطي السيولة</span><span>{cashRunway.toFixed(1)} شهر</span></li>
            <li><span>هامش الربح</span><span>{profitMargin.toFixed(1)}%</span></li>
            <li><span>فواتير مستحقة</span><span>{formatCurrency(financialState.outstandingInvoices)}</span></li>
            <li><span>فواتير متأخرة</span><span>{formatCurrency(overdue)}</span></li>
          </ul>
        </article>

        <article className="card funding-card">
          <div className="card-header">
            <div>
              <p className="eyebrow">العرض التمويلي</p>
              <h3>{selected.amount > 0 ? "تفاصيل التمويل المقترح" : "لا حاجة لتمويل حاليًا"}</h3>
            </div>
            <span className="chip" style={{
              background: selected.riskLevel === "مرتفع" ? "var(--coral-soft)" : selected.riskLevel === "متوسط" ? "var(--gold-soft)" : "var(--mint-soft)",
              color: selected.riskLevel === "مرتفع" ? "var(--coral)" : selected.riskLevel === "متوسط" ? "var(--gold)" : "var(--mint)",
            }}>
              مخاطر {selected.riskLevel}
            </span>
          </div>
          <div className="funding-amount">{selected.amount > 0 ? formatCurrency(selected.amount) : "—"}</div>
          {selected.amount > 0 && (
            <ul className="status-list" style={{ marginTop: "16px" }}>
              <li><span>نوع التمويل</span><span>{selected.fundingType}</span></li>
              <li><span>القسط الشهري التقديري</span><span>{formatCurrency(selected.monthlyInstallment)}</span></li>
            </ul>
          )}

          <button className="primary-button" type="button" onClick={handleRequest} style={{ marginTop: "18px", width: "100%" }} disabled={selected.amount === 0 || submitting}>
            {submitting ? "جارٍ الإرسال..." : selected.amount > 0 ? "طلب هذا التمويل" : "لا حاجة لإجراء"}
          </button>

          {error && <p className="hero-text" style={{ color: "var(--coral)", marginTop: "10px" }}>{error}</p>}
          {confirmation && (
            <div className="vitals-ok-banner" style={{ marginTop: "14px" }}>
              تم تسجيل الطلب — الرقم المرجعي: <strong style={{ fontFamily: "IBM Plex Mono, monospace" }}>{confirmation.referenceNumber}</strong>
            </div>
          )}
        </article>
      </section>

      {requests.length > 0 && (
        <section className="card">
          <div className="card-header">
            <div>
              <p className="eyebrow">السجل</p>
              <h3>طلبات التمويل السابقة</h3>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>الرقم المرجعي</th><th>النوع</th><th>المبلغ</th><th>الحالة</th></tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id}>
                    <td className="mono">{r.referenceNumber}</td>
                    <td>{r.fundingType}</td>
                    <td className="mono">{formatCurrency(r.amount)}</td>
                    <td><span className="table-status pending">{r.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
