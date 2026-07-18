import { useMemo, useState } from "react";
import { apiFetch } from "../api";

const emptyForm = {
  customer: "",
  amount: "",
  dueDate: "",
  status: "معلقة",
};

function formatCurrency(value) {
  return `${Number(value || 0).toLocaleString("en-SA")} ر.س`;
}

export default function Invoices({ financialState, refreshData }) {
  const [filter, setFilter] = useState("الكل");
  const [formValues, setFormValues] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState(emptyForm);
const invoiceStats = useMemo(() => {

  const total = financialState.invoices.reduce(
    (sum, invoice) => sum + invoice.amount,
    0
  );

  const paid = financialState.invoices
    .filter((invoice) => invoice.status === "مدفوعة")
    .reduce((sum, invoice) => sum + invoice.amount, 0);

  const overdue = financialState.invoices
    .filter((invoice) => invoice.status === "متأخرة")
    .reduce((sum, invoice) => sum + invoice.amount, 0);

  return {
    total,
    paid,
    overdue,
    count: financialState.invoices.length,
  };

}, [financialState.invoices]);
  const filteredInvoices = useMemo(() => {
    if (filter === "مدفوعة") {
      return financialState.invoices.filter((item) => item.status === "مدفوعة");
    }
    if (filter === "معلقة") {
      return financialState.invoices.filter((item) => item.status === "معلقة");
    }
    if (filter === "متأخرة") {
      return financialState.invoices.filter((item) => item.status === "متأخرة");
    }
    return financialState.invoices;
  }, [filter, financialState.invoices]);

  const handleAddInvoice = () => {
    if (!formValues.customer || !formValues.amount || !formValues.dueDate) {
      return;
    }

    const newInvoice = {
      customer: formValues.customer,
      amount: Number(formValues.amount),
      dueDate: formValues.dueDate,
      status: formValues.status,
    };

    apiFetch(`/invoices`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newInvoice),
    })
      .then((response) => response.json())
      .then(() => {
        setFormValues(emptyForm);
        // نعيد جلب التحليل كامل من السيرفر عشان كل المؤشرات (السيولة،
        // التنبؤ، التوصيات) تنعاد حسابها بالفاتورة الجديدة
        refreshData();
      })
      .catch((error) => console.error(error));
  };

  const startEdit = (invoice) => {
    setEditingId(invoice.id);
    setEditValues({
      customer: invoice.customer,
      amount: String(invoice.amount),
      dueDate: invoice.dueDate,
      status: invoice.status,
    });
  };

  const handleEditSave = () => {
    if (!editingId) {
      return;
    }

    apiFetch(`/invoices/${editingId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer: editValues.customer,
        amount: Number(editValues.amount),
        dueDate: editValues.dueDate,
        status: editValues.status,
      }),
    })
      .then((response) => response.json())
      .then(() => {
        setEditingId(null);
        setEditValues(emptyForm);
        refreshData();
      })
      .catch((error) => console.error(error));
  };

  const handleDelete = (id) => {
    apiFetch(`/invoices/${id}`, { method: "DELETE" })
      .then(() => {
        if (editingId === id) {
          setEditingId(null);
          setEditValues(emptyForm);
        }
        refreshData();
      })
      .catch((error) => console.error(error));
  };

  // ملاحظة: بالنسخة الأصلية، "تحديد كمدفوعة" كان يعدّل الحالة محليًا بالمتصفح
  // فقط بدون حفظها فعليًا بقاعدة البيانات (كانت تختفي بعد أي تحديث للصفحة).
  // الآن يرسل طلب PUT حقيقي للسيرفر ويحفظ التغيير بشكل دائم.
  const handleMarkPaid = (id) => {
    apiFetch(`/invoices/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "مدفوعة" }),
    })
      .then(() => refreshData())
      .catch((error) => console.error(error));
  };

  return (
    <div className="dashboard-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">الفواتير</p>
          <h1 className="page-title">إدارة الفواتير</h1>
        </div>
        <div className="topbar-actions">
          <div className="date-pill">سجل الفواتير</div>
          <button className="icon-button" type="button" aria-label="تحديث الفواتير">↻</button>
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
          <h2 className="section-title">المستحقات والفواتير</h2>
          <p className="hero-text">
            تتبع الحالة الحالية للفواتير وتقييم الالتزام السريع من العملاء.
          </p>
        </div>
      </section>
<section className="kpi-grid">

  <article className="metric-card emerald">
    <p className="metric-title">Total Invoices</p>
    <h3 className="metric-value">
      {invoiceStats.count}
    </h3>
  </article>

  <article className="metric-card blue">
    <p className="metric-title">Total Value</p>
    <h3 className="metric-value">
      {formatCurrency(invoiceStats.total)}
    </h3>
  </article>

  <article className="metric-card amber">
    <p className="metric-title">Paid</p>
    <h3 className="metric-value">
      {formatCurrency(invoiceStats.paid)}
    </h3>
  </article>

  <article className="metric-card slate">
    <p className="metric-title">Overdue</p>
    <h3 className="metric-value">
      {formatCurrency(invoiceStats.overdue)}
    </h3>
  </article>

</section>
      <section className="card">
        <div className="card-header">
          <div>
            <p className="eyebrow">الفلاتر</p>
            <h3>تصفية السجل</h3>
          </div>
          <div className="topbar-actions">
            {['الكل', 'مدفوعة', 'معلقة', 'متأخرة'].map((option) => (
              <button
                key={option}
                className="ghost-button"
                type="button"
                onClick={() => setFilter(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: "14px" }}>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "8px" }}>
            <input
              value={formValues.customer}
              onChange={(event) => setFormValues((current) => ({ ...current, customer: event.target.value }))}
              placeholder="اسم العميل"
              className="field-input" style={{ flex: "1", minWidth: "160px" }}
            />
            <input
              value={formValues.amount}
              onChange={(event) => setFormValues((current) => ({ ...current, amount: event.target.value }))}
              placeholder="المبلغ"
              type="number"
              className="field-input" style={{ width: "140px" }}
            />
            <input
              value={formValues.dueDate}
              onChange={(event) => setFormValues((current) => ({ ...current, dueDate: event.target.value }))}
              type="date"
              className="field-input"
            />
            <select
              value={formValues.status}
              onChange={(event) => setFormValues((current) => ({ ...current, status: event.target.value }))}
              className="field-input"
            >
              <option value="معلقة">معلقة</option>
              <option value="متأخرة">متأخرة</option>
              <option value="مدفوعة">مدفوعة</option>
            </select>
            <button className="primary-button" type="button" onClick={handleAddInvoice}>
              إضافة فاتورة
            </button>
          </div>
          {editingId && (
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <input
                value={editValues.customer}
                onChange={(event) => setEditValues((current) => ({ ...current, customer: event.target.value }))}
                placeholder="اسم العميل"
                className="field-input" style={{ flex: "1", minWidth: "160px" }}
              />
              <input
                value={editValues.amount}
                onChange={(event) => setEditValues((current) => ({ ...current, amount: event.target.value }))}
                placeholder="المبلغ"
                type="number"
                className="field-input" style={{ width: "140px" }}
              />
              <input
                value={editValues.dueDate}
                onChange={(event) => setEditValues((current) => ({ ...current, dueDate: event.target.value }))}
                type="date"
                className="field-input"
              />
              <select
                value={editValues.status}
                onChange={(event) => setEditValues((current) => ({ ...current, status: event.target.value }))}
                className="field-input"
              >
                <option value="معلقة">معلقة</option>
                <option value="متأخرة">متأخرة</option>
                <option value="مدفوعة">مدفوعة</option>
              </select>
              <button className="primary-button" type="button" onClick={handleEditSave}>
                حفظ التعديل
              </button>
            </div>
          )}
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>رقم الفاتورة</th>
                <th>العميل</th>
                <th>المبلغ</th>
                <th>تاريخ الاستحقاق</th>
                <th>الحالة</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="mono">{invoice.id}</td>
                  <td>{invoice.customer}</td>
                  <td className="mono">{formatCurrency(invoice.amount)}</td>
                  <td>{invoice.dueDate}</td>
                  <td>
                    <span
  className={`table-status ${
    invoice.status === "مدفوعة" ? "paid" : invoice.status === "متأخرة" ? "overdue" : "pending"
  }`}
>
  {invoice.status}
</span>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      <button className="ghost-button" type="button" onClick={() => startEdit(invoice)}>
                        تعديل
                      </button>
                      <button className="ghost-button" type="button" onClick={() => handleMarkPaid(invoice.id)}>
                        تسديد
                      </button>
                      <button className="ghost-button" type="button" onClick={() => handleDelete(invoice.id)}>
                        حذف
                      </button>
                      {invoice.status === "متأخرة" && (
  <div
    style={{
      color: "var(--coral)",
      fontSize: "12px",
      marginTop: "6px",
      fontWeight: "600",
    }}
  >
    ⚠ فاتورة متأخرة السداد
  </div>
)}
                    </div>
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
