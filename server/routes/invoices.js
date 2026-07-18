import { Router } from "express";
import crypto from "crypto";
import { db } from "../db.js";

const router = Router();

function rowToInvoice(row) {
  return { id: row.id, customer: row.customer, amount: row.amount, dueDate: row.due_date, status: row.status, paidDate: row.paid_date };
}

// GET /api/invoices — فواتير شركة المستخدم فقط
router.get("/", (req, res) => {
  const rows = db.prepare("SELECT * FROM invoices WHERE company_id = ? ORDER BY due_date ASC").all(req.companyId);
  res.json(rows.map(rowToInvoice));
});

// POST /api/invoices — الرقم يُولَّد من السيرفر دائمًا (لا نثق برقم قادم من العميل، تفاديًا للتصادم)
router.post("/", (req, res) => {
  const { customer, amount, dueDate, status } = req.body;

  if (!customer || !amount || !dueDate || !status) {
    return res.status(400).json({ error: "بيانات الفاتورة غير مكتملة" });
  }

  const id = `INV-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
  const paidDate = status === "مدفوعة" ? new Date().toISOString().slice(0, 10) : null;

  db.prepare(
    `INSERT INTO invoices (id, company_id, customer, amount, due_date, status, paid_date) VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, req.companyId, customer, Number(amount), dueDate, status, paidDate);

  const row = db.prepare("SELECT * FROM invoices WHERE id = ?").get(id);
  res.status(201).json(rowToInvoice(row));
});

// PUT /api/invoices/:id — يتحقق دائمًا إن الفاتورة تخص شركة المستخدم قبل التعديل
router.put("/:id", (req, res) => {
  const { id } = req.params;
  const existing = db.prepare("SELECT * FROM invoices WHERE id = ? AND company_id = ?").get(id, req.companyId);
  if (!existing) return res.status(404).json({ error: "الفاتورة غير موجودة" });

  const customer = req.body.customer ?? existing.customer;
  const amount = req.body.amount !== undefined ? Number(req.body.amount) : existing.amount;
  const dueDate = req.body.dueDate ?? existing.due_date;
  const status = req.body.status ?? existing.status;
  const paidDate = status === "مدفوعة" ? (existing.paid_date ?? new Date().toISOString().slice(0, 10)) : null;

  db.prepare(
    `UPDATE invoices SET customer = ?, amount = ?, due_date = ?, status = ?, paid_date = ? WHERE id = ? AND company_id = ?`
  ).run(customer, amount, dueDate, status, paidDate, id, req.companyId);

  const updated = db.prepare("SELECT * FROM invoices WHERE id = ?").get(id);
  res.json(rowToInvoice(updated));
});

// DELETE /api/invoices/:id
router.delete("/:id", (req, res) => {
  const { id } = req.params;
  db.prepare("DELETE FROM invoices WHERE id = ? AND company_id = ?").run(id, req.companyId);
  res.json({ success: true });
});

export default router;
