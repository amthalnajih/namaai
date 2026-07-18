import { useEffect, useState } from "react";

export default function Settings({ financialState, updateFinancialState }) {
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [localValues, setLocalValues] = useState({
    companyName: financialState.companyName,
    industry: financialState.industry,
    monthlyExpenses: financialState.monthlyExpenses,
    monthlyRevenue: financialState.monthlyRevenue,
  });

  // مزامنة الحقول المحلية إذا تغيّرت بيانات السيرفر من مكان ثاني
  useEffect(() => {
    setLocalValues({
      companyName: financialState.companyName,
      industry: financialState.industry,
      monthlyExpenses: financialState.monthlyExpenses,
      monthlyRevenue: financialState.monthlyRevenue,
    });
  }, [financialState.companyName, financialState.industry, financialState.monthlyExpenses, financialState.monthlyRevenue]);

  const handleFieldChange = (field) => (event) => {
    const value = field === "monthlyExpenses" || field === "monthlyRevenue" ? Number(event.target.value) || 0 : event.target.value;
    setLocalValues((current) => ({ ...current, [field]: value }));
    setSaved(false);
  };

  // الحفظ الفعلي يحصل فقط عند الضغط على الزر — يرسل تحديثًا واحدًا
  // للسيرفر (بدل طلب لكل حرف يُكتب) ويُحفظ فعليًا بقاعدة البيانات
  const handleSave = async () => {
    setSaving(true);
    await updateFinancialState(localValues);
    setSaving(false);
    setSaved(true);
  };

  return (
    <div className="dashboard-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">الإعدادات</p>
          <h1 className="page-title">الإعدادات العامة</h1>
        </div>
        <div className="topbar-actions">
          <div className="date-pill">التفضيلات</div>
          <div className="profile-chip">
            <div className="avatar">س</div>
            <div>
              <div className="profile-name">محمد الشمري</div>
              <div className="profile-role">الرئيس التنفيذي </div>
            </div>
          </div>
        </div>
      </header>

      <section className="hero-card">
        <div>
          <p className="eyebrow">الصفحة</p>
          <h2 className="section-title">إدارة البيانات الأساسية</h2>
          <p className="hero-text">
            تحديث بيانات الشركة والميزانية الأساسية للحفاظ على دقة التحليل. التغييرات تُحفظ فعليًا في قاعدة البيانات.
          </p>
        </div>
      </section>

      <section className="dashboard-grid">
        <article className="card">
          <div className="card-header">
            <div>
              <p className="eyebrow">البيانات</p>
              <h3>معلومات الشركة</h3>
            </div>
          </div>
          <div className="status-list">
            <label>
              <div className="field-label">اسم الشركة</div>
              <input value={localValues.companyName} onChange={handleFieldChange("companyName")} className="field-input" />
            </label>
            <label>
              <div className="field-label" style={{ marginTop: "12px" }}>القطاع</div>
              <input value={localValues.industry} onChange={handleFieldChange("industry")} className="field-input" />
            </label>
            <label>
              <div className="field-label" style={{ marginTop: "12px" }}>المصروفات الشهرية</div>
              <input value={localValues.monthlyExpenses} type="number" onChange={handleFieldChange("monthlyExpenses")} className="field-input" />
            </label>
            <label>
              <div className="field-label" style={{ marginTop: "12px" }}>الإيراد الشهري</div>
              <input value={localValues.monthlyRevenue} type="number" onChange={handleFieldChange("monthlyRevenue")} className="field-input" />
            </label>
            <button className="primary-button" type="button" onClick={handleSave} style={{ marginTop: "14px" }} disabled={saving}>
              {saving ? "جارٍ الحفظ..." : "حفظ"}
            </button>
            {saved && <p className="hero-text" style={{ marginTop: "10px" }}>تم حفظ التغييرات بنجاح بقاعدة البيانات.</p>}
          </div>
        </article>

        <article className="card">
          <div className="card-header">
            <div>
              <p className="eyebrow">المراجعة</p>
              <h3>ملخص الإعدادات (محفوظ حاليًا)</h3>
            </div>
          </div>
          <p className="hero-text">الاسم: {financialState.companyName}</p>
          <p className="hero-text" style={{ marginTop: "8px" }}>القطاع: {financialState.industry}</p>
          <p className="hero-text" style={{ marginTop: "8px" }}>المصروفات: {financialState.monthlyExpenses}</p>
          <p className="hero-text" style={{ marginTop: "8px" }}>الإيراد: {financialState.monthlyRevenue}</p>
        </article>
      </section>
    </div>
  );
}
