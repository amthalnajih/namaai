import { useEffect, useState } from "react";
import { apiFetch } from "../api";

function formatCurrency(value) {
  return `${Number(value || 0).toLocaleString("en-SA")} ر.س`;
}

export default function Liquidity({ financialState }) {
  const [formValues, setFormValues] = useState({
    currentCash: financialState.currentCash,
    monthlyRevenue: financialState.monthlyRevenue,
    monthlyExpenses: financialState.monthlyExpenses,
  });
  const [simulated, setSimulated] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setFormValues({
      currentCash: financialState.currentCash,
      monthlyRevenue: financialState.monthlyRevenue,
      monthlyExpenses: financialState.monthlyExpenses,
    });
    setSimulated(null);
  }, [financialState]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormValues((currentValues) => ({ ...currentValues, [name]: Number(value) || 0 }));
  };

  // يستدعي نفس محرك التحليل الحقيقي بالسيرفر (POST /api/analysis/simulate)
  // بأرقام افتراضية مؤقتة — بدون أي حفظ بقاعدة البيانات. هذا يضمن إن نتيجة
  // "ماذا لو" مطابقة تمامًا لما بيصير فعليًا لو حفظت هذي الأرقام، لأنها
  // نفس معادلة التنبؤ والصحة المالية الحقيقية، مو نسخة مبسّطة بالفرونت.
  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/analysis/simulate", {
        method: "POST",
        body: JSON.stringify(formValues),
      });
      const data = await res.json();
      setSimulated(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const displayed = simulated ?? financialState;

  return (
    <div className="dashboard-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">التحليل</p>
          <h1 className="page-title">تحليل السيولة</h1>
        </div>
        <div className="topbar-actions">
          <div className="date-pill">نظرة شاملة</div>
        </div>
      </header>

      <section className="hero-card">
        <div>
          <p className="eyebrow">الصفحة</p>
          <h2 className="section-title">مؤشرات السيولة الحالية (بيانات حقيقية من الخادم)</h2>
          <p className="hero-text">يوفر هذا القسم عرضًا واضحًا للسيولة النقدية ومقدار المرونة المتاحة للتشغيل اليومي.</p>
        </div>
      </section>

      <section className="kpi-grid">
        <article className="metric-card emerald">
          <p className="metric-title">نسبة السيولة</p>
          <h3 className="metric-value">{financialState.liquidityRatio.toFixed(2)}</h3>
          <p className="metric-caption">{financialState.liquidityStatus}</p>
        </article>
        <article className="metric-card blue">
          <p className="metric-title">الرصيد المتوقع (30 يوم)</p>
          <h3 className="metric-value">{formatCurrency(financialState.projectedCash)}</h3>
          <p className="metric-caption">متاح للاستعمال</p>
        </article>
        <article className="metric-card amber">
          <p className="metric-title">المصروفات الشهرية</p>
          <h3 className="metric-value">{formatCurrency(financialState.monthlyExpenses)}</h3>
          <p className="metric-caption">أعباء تشغيلية</p>
        </article>
        <article className="metric-card slate">
          <p className="metric-title">الإيراد الشهري</p>
          <h3 className="metric-value">{formatCurrency(financialState.monthlyRevenue)}</h3>
          <p className="metric-caption">دخل مستمر</p>
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="card">
          <div className="card-header">
            <div>
              <p className="eyebrow">محاكاة حقيقية (What-If)</p>
              <h3>جرّب سيناريو افتراضي</h3>
            </div>
          </div>

          <p className="hero-text" style={{ marginBottom: "10px", fontSize: "13px" }}>
            عدّل الأرقام وشغّل نفس محرك التحليل الحقيقي بالسيرفر — بدون حفظ أي تغيير على بياناتك الفعلية.
          </p>
          {[
            { label: "الرصيد النقدي الحالي", name: "currentCash" },
            { label: "الإيراد الشهري المتوقع", name: "monthlyRevenue" },
            { label: "المصروفات الشهرية", name: "monthlyExpenses" },
          ].map((field) => (
            <div key={field.name} style={{ marginBottom: "12px" }}>
              <label className="field-label" htmlFor={field.name}>{field.label}</label>
              <input
                id={field.name}
                name={field.name}
                type="number"
                value={formValues[field.name]}
                onChange={handleChange}
                className="field-input"
              />
            </div>
          ))}
          <button type="button" className="primary-button" onClick={handleAnalyze} disabled={loading} style={{ width: "100%", marginTop: "6px" }}>
            {loading ? "جارٍ التحليل..." : "حلّل السيناريو عبر محرك التحليل الحقيقي"}
          </button>
        </article>

        <article className="card">
          <div className="card-header">
            <div>
              <p className="eyebrow">النتائج</p>
              <h3>{simulated ? "نتيجة السيناريو الافتراضي" : "التقييم الحالي (حقيقي)"}</h3>
            </div>
          </div>

          <p className="hero-text"><strong>الرصيد المتوقع بعد 30 يوم:</strong> {formatCurrency(displayed.projectedCash)}</p>
          <p className="hero-text"><strong>نسبة السيولة:</strong> {displayed.liquidityRatio.toFixed(2)}</p>
          <p className="hero-text"><strong>مؤشر الصحة المالية:</strong> {displayed.financialHealthScore}/100</p>
          <p className="hero-text"><strong>حالة السيولة:</strong> {displayed.liquidityStatus}</p>
          <p className="hero-text"><strong>مستوى الخطر:</strong> {displayed.riskLevel}</p>
          {displayed.daysUntilDeficit !== null && displayed.daysUntilDeficit !== undefined && (
            <p className="hero-text" style={{ color: "var(--coral)" }}>
              <strong>⚠️ عجز متوقع خلال {displayed.daysUntilDeficit} يوم</strong> (بتاريخ {displayed.deficitDate})
            </p>
          )}
        </article>
      </section>
    </div>
  );
}
