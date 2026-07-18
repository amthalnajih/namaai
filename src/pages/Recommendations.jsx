import { useEffect, useState } from "react";
import { apiFetch } from "../api";

export default function Recommendations({ financialState, refreshData }) {
  const [list, setList] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [aiConfigured, setAiConfigured] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [aiError, setAiError] = useState(null);

  const loadRecommendations = () => {
    setLoading(true);
    apiFetch("/analysis/recommendations")
      .then((res) => res.json())
      .then((data) => {
        setList(data.list || []);
        setSelectedIndex(0);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  const checkAiStatus = () => {
    apiFetch("/analysis/ai-status")
      .then((res) => res.json())
      .then((data) => setAiConfigured(data.configured))
      .catch(() => setAiConfigured(false));
  };

  useEffect(() => {
    loadRecommendations();
    checkAiStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // يستدعي Claude API فعليًا (POST /api/analysis/ai-insight)، ويحدّث كل
  // شي بعدها (التوصيات هنا + بيانات لوحة التحكم كاملة عبر refreshData)
  const handleGenerateAI = async () => {
    setGenerating(true);
    setAiError(null);
    try {
      const res = await apiFetch("/analysis/ai-insight", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setAiError(data.error || "تعذر توليد التحليل");
        return;
      }
      await refreshData();
      loadRecommendations();
    } catch (err) {
      console.error(err);
      setAiError("تعذر الاتصال بالخادم");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="dashboard-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">توصيات AI</p>
          <h1 className="page-title">توصيات الذكاء الاصطناعي</h1>
        </div>
        <div className="topbar-actions">
          <div className="date-pill">{financialState.aiGenerated ? "✨ مولّد بواسطة Claude" : "تحليل مبني على قواعد"}</div>
        </div>
      </header>

      <section className="hero-card">
        <div style={{ width: "100%" }}>
          <p className="eyebrow">الصفحة</p>
          <h2 className="section-title">اقتراحات عملية مبنية على بياناتك الفعلية</h2>
          <p className="hero-text" style={{ marginBottom: "16px" }}>
            محرك القواعد يحسب المؤشرات المالية بشكل حتمي وقابل للتفسير. الزر بالأسفل يرسل هذي المؤشرات فعليًا
            لنموذج Claude (Anthropic) عشان يحللها ويكتب توصية بلغة طبيعية وخطوات عملية مخصصة — طبقة توليدية حقيقية
            فوق محرك قرار حتمي، مو نص جاهز.
          </p>

          {aiConfigured === false && (
            <div className="vitals-alert" style={{ margin: "0 0 14px" }}>
              ⚠️ مفتاح Claude API غير مُعد بملف <code>.env</code> بالسيرفر. أضف <code>ANTHROPIC_API_KEY</code> ثم أعد تشغيل السيرفر لتفعيل هذا الزر.
            </div>
          )}

          <button className="primary-button" type="button" onClick={handleGenerateAI} disabled={generating || aiConfigured === false}>
            {generating ? "✨ Claude يحلل بياناتك الآن..." : "✨ توليد تحليل ذكي عبر Claude API"}
          </button>

          {aiError && <p className="hero-text" style={{ color: "var(--coral)", marginTop: "10px" }}>{aiError}</p>}
          {financialState.aiGeneratedAt && (
            <p className="hero-text" style={{ marginTop: "10px", fontSize: "12px" }}>
              آخر تحليل ذكي: {new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(financialState.aiGeneratedAt))}
            </p>
          )}
        </div>
      </section>

      <section className="dashboard-grid">
        <article className="card">
          <div className="card-header">
            <div>
              <p className="eyebrow">قائمة</p>
              <h3>كل التوصيات</h3>
            </div>
          </div>
          <div className="status-list" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {loading && <p className="hero-text">جارٍ التحميل...</p>}
            {!loading && list.map((item, index) => (
              <button
                key={item}
                className={`ghost-button ${index === selectedIndex ? "selected" : ""}`}
                type="button"
                onClick={() => setSelectedIndex(index)}
                style={{ width: "100%", justifyContent: "flex-start", textAlign: "right" }}
              >
                {item}
              </button>
            ))}
          </div>
        </article>

        <article className="card">
          <div className="card-header">
            <div>
              <p className="eyebrow">التفاصيل</p>
              <h3>التوصية المختارة</h3>
            </div>
          </div>
          <p className="hero-text">{list[selectedIndex] ?? financialState.aiRecommendation}</p>
        </article>
      </section>
    </div>
  );
}
