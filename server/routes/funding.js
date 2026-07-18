import { Router } from "express";
import crypto from "crypto";
import { db } from "../db.js";
import { computeSnapshot } from "../analysis.js";

const router = Router();

function generateReferenceNumber() {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = crypto.randomBytes(2).toString("hex").toUpperCase();
  return `FR-${stamp}-${rand}`;
}

// GET /api/funding/requests — كل طلبات التمويل السابقة لشركة المستخدم
router.get("/requests", (req, res) => {
  const rows = db
    .prepare("SELECT * FROM funding_requests WHERE company_id = ? ORDER BY created_at DESC")
    .all(req.companyId);

  res.json(
    rows.map((r) => ({
      id: r.id,
      referenceNumber: r.reference_number,
      amount: r.amount,
      fundingType: r.funding_type,
      riskLevel: r.risk_level,
      monthlyInstallment: r.monthly_installment,
      status: r.status,
      createdAt: r.created_at,
    }))
  );
});

// POST /api/funding/request — يسجّل طلب تمويل فعلي بقاعدة البيانات، مبني
// على التوصية المحسوبة حاليًا لحظة الطلب (مو رقم يُرسله العميل بحرية)
router.post("/request", (req, res) => {
  const snapshot = computeSnapshot(req.companyId);

  if (!snapshot.hasData) {
    return res.status(400).json({ error: "لا توجد بيانات كافية لتقديم طلب" });
  }

  const funding = snapshot.recommendedFunding;
  if (!funding.amount || funding.amount <= 0) {
    return res.status(400).json({ error: "لا يوجد تمويل موصى به حاليًا لتقديم طلب بشأنه" });
  }

  const referenceNumber = generateReferenceNumber();

  db.prepare(
    `INSERT INTO funding_requests (company_id, reference_number, amount, funding_type, risk_level, monthly_installment, status)
     VALUES (?, ?, ?, ?, ?, ?, 'قيد المراجعة')`
  ).run(req.companyId, referenceNumber, funding.amount, funding.fundingType, funding.riskLevel, funding.monthlyInstallment);

  res.status(201).json({
    referenceNumber,
    amount: funding.amount,
    fundingType: funding.fundingType,
    status: "قيد المراجعة",
    message: "تم تسجيل طلب التمويل بنجاح. هذا نموذج أولي (MVP) — لا يتم صرف تمويل حقيقي، لكن الطلب محفوظ فعليًا بقاعدة البيانات ويمكن ربطه لاحقًا بنظام اعتماد القروض الفعلي بالبنك.",
  });
});

export default router;
