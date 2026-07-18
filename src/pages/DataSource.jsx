import { useEffect, useState } from "react";
import { API_BASE } from "../api";

function formatDateTime(iso) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}

export default function DataSource({ onDataReset }) {
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [lastCredentials, setLastCredentials] = useState(null);

  const loadStatus = () => {
    // مسار عام (بدون توكن) بما إنه أداة تجهيز الديمو نفسها
    fetch(`${API_BASE}/datasource`)
      .then((res) => res.json())
      .then(setStatus)
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleGenerate = async () => {
    setBusy(true);
    setConfirmClear(false);
    try {
      const res = await fetch(`${API_BASE}/datasource/generate`, { method: "POST" });
      const data = await res.json();
      setStatus({ source: data.source, generatedAt: data.generatedAt, seed: String(data.seed), counts: data.counts });
      setLastCredentials({ email: data.demoEmail, password: data.demoPassword });
      // توليد بيانات جديدة يمسح المستخدمين والجلسات القديمة (بما فيها
      // جلستنا الحالية) وينشئ مستخدمًا تجريبيًا جديدًا — لازم تسجيل دخول من جديد
      onDataReset();
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  const handleClear = async () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/datasource`, { method: "DELETE" });
      const data = await res.json();
      setStatus({ source: data.source, generatedAt: null, seed: null, counts: data.counts });
      setLastCredentials(null);
      onDataReset();
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
      setConfirmClear(false);
    }
  };

  const isEmpty = status && status.counts && status.counts.companies === 0;

  return (
    <div className="dashboard-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">مصدر البيانات</p>
          <h1 className="page-title">إدارة مصدر البيانات</h1>
        </div>
        <div className="topbar-actions">
          <div className="date-pill">{status?.source === "synthetic" ? "بيانات اصطناعية" : status?.source === "empty" ? "لا توجد بيانات" : "..."}</div>
        </div>
      </header>

      <section className="hero-card">
        <div>
          <p className="eyebrow">لماذا هذي الصفحة موجودة</p>
          <h2 className="section-title">قاعدة بيانات حقيقية متعددة المنشآت، بيانات اصطناعية مؤقتًا</h2>
          <p className="hero-text">
            قاعدة البيانات مبنية أصلًا لتخدم عدد غير محدود من المنشآت (كل بيانات مرتبطة بمعرّف منشأة company_id)،
            تمامًا زي أي بنك يخدم آلاف الـ SMEs. الزر بالأسفل يولّد منشأة اصطناعية واحدة بكل بياناتها (شركة، فواتير،
            90 يوم حركات مالية، مستخدم دخول) — بسبب استحالة استخدام بيانات عملاء حقيقية لأسباب تتعلق بسريّة البيانات
            المصرفية. لما تتوفر بيانات حقيقية، تُستبدل نفس هذي الخطوة بجلب حقيقي من البنك لكل عميل،{" "}
            <strong>بدون أي تعديل على منطق التحليل أو التنبؤ أو واجهات الـ API</strong>.
          </p>
        </div>
      </section>

      <section className="dashboard-grid">
        <article className="card">
          <div className="card-header">
            <div>
              <p className="eyebrow">الحالة الحالية</p>
              <h3>حالة قاعدة البيانات</h3>
            </div>
          </div>
          <ul className="status-list">
            <li><span>مصدر البيانات</span><span>{status?.source === "synthetic" ? "اصطناعي (Synthetic)" : status?.source === "empty" ? "فاضٍ" : "..."}</span></li>
            <li><span>آخر توليد</span><span>{formatDateTime(status?.generatedAt)}</span></li>
            <li><span>عدد المنشآت</span><span>{status?.counts?.companies ?? "—"}</span></li>
            <li><span>عدد الفواتير</span><span>{status?.counts?.invoices ?? "—"}</span></li>
            <li><span>عدد الحركات المالية</span><span>{status?.counts?.transactions ?? "—"}</span></li>
          </ul>
        </article>

        <article className="card">
          <div className="card-header">
            <div>
              <p className="eyebrow">إجراءات</p>
              <h3>توليد أو مسح البيانات</h3>
            </div>
          </div>
          <p className="hero-text" style={{ marginBottom: "16px" }}>
            ⚠️ توليد أو مسح البيانات ينشئ/يحذف حساب الدخول أيضًا، فراح تحتاج تسجّل دخول من جديد بعدها مباشرة
            (بنفس بيانات الدخول التجريبية).
          </p>

          <button className="primary-button" type="button" onClick={handleGenerate} disabled={busy} style={{ width: "100%" }}>
            {busy ? "جارٍ التوليد..." : "⚡ توليد بيانات اصطناعية جديدة"}
          </button>

          <button
            className="ghost-button"
            type="button"
            onClick={handleClear}
            disabled={busy || isEmpty}
            style={{ width: "100%", marginTop: "10px", color: confirmClear ? "var(--coral)" : undefined, borderColor: confirmClear ? "var(--coral)" : undefined }}
          >
            {confirmClear ? "اضغط مرة ثانية للتأكيد — سيتم مسح كل البيانات" : "🗑 مسح كل البيانات (حالة فاضية)"}
          </button>

          {lastCredentials && (
            <div className="vitals-ok-banner" style={{ marginTop: "16px" }}>
              تم التوليد. سجّل دخول من جديد بـ: {lastCredentials.email} / {lastCredentials.password}
            </div>
          )}
        </article>
      </section>
    </div>
  );
}
