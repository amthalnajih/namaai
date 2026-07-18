import { Router } from "express";
import { db } from "../db.js";

const router = Router();

function serialize(company) {
  return {
    id: company.id,
    name: company.name,
    industry: company.industry,
    currentCash: company.current_cash,
    monthlyRevenue: company.monthly_revenue,
    monthlyExpenses: company.monthly_expenses,
    creditLimit: company.credit_limit,
    availableCredit: company.available_credit,
  };
}

// GET /api/company — بيانات شركة المستخدم المسجّل دخوله (req.companyId من requireAuth)
router.get("/", (req, res) => {
  const company = db.prepare("SELECT * FROM companies WHERE id = ?").get(req.companyId);
  if (!company) return res.status(404).json({ error: "لا توجد بيانات شركة" });
  res.json(serialize(company));
});

// PUT /api/company — تحديث بيانات شركة المستخدم فقط (لا يقدر يعدّل شركة ثانية)
router.put("/", (req, res) => {
  const existing = db.prepare("SELECT * FROM companies WHERE id = ?").get(req.companyId);
  if (!existing) return res.status(404).json({ error: "لا توجد بيانات شركة" });

  const name = req.body.companyName ?? existing.name;
  const industry = req.body.industry ?? existing.industry;
  const monthlyRevenue = req.body.monthlyRevenue ?? existing.monthly_revenue;
  const monthlyExpenses = req.body.monthlyExpenses ?? existing.monthly_expenses;
  const currentCash = req.body.currentCash ?? existing.current_cash;

  db.prepare(
    `UPDATE companies SET name = ?, industry = ?, monthly_revenue = ?, monthly_expenses = ?, current_cash = ? WHERE id = ?`
  ).run(name, industry, monthlyRevenue, monthlyExpenses, currentCash, req.companyId);

  const updated = db.prepare("SELECT * FROM companies WHERE id = ?").get(req.companyId);
  res.json(serialize(updated));
});

export default router;
