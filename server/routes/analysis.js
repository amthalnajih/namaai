import { Router } from "express";
import { db } from "../db.js";
import { computeSnapshot, attachCachedInsight, buildRecommendationList, getCategoryBreakdown } from "../analysis.js";
import { generateAIInsight, isAIConfigured } from "../ai.js";

const router = Router();

// GET /api/analysis — سريع، حتمي بالكامل (بدون استدعاء شبكي)، يدمج معه
// آخر تحليل AI مخزّن مسبقًا إن وجد
router.get("/", (req, res) => {
  const snapshot = computeSnapshot(req.companyId);
  res.json(attachCachedInsight(snapshot, req.companyId));
});

router.get("/recommendations", (req, res) => {
  const snapshot = attachCachedInsight(computeSnapshot(req.companyId), req.companyId);
  const list = buildRecommendationList(snapshot);
  res.json({ aiRecommendation: snapshot.aiRecommendation, list, aiGenerated: snapshot.aiGenerated });
});

// POST /api/analysis/simulate — محاكاة "ماذا لو" حقيقية: تشغّل نفس محرك
// التحليل بأرقام افتراضية مؤقتة (بدون أي حفظ بقاعدة البيانات)
router.post("/simulate", (req, res) => {
  const overrides = {};
  if (req.body.currentCash !== undefined) overrides.current_cash = Number(req.body.currentCash);
  if (req.body.monthlyRevenue !== undefined) overrides.monthly_revenue = Number(req.body.monthlyRevenue);
  if (req.body.monthlyExpenses !== undefined) overrides.monthly_expenses = Number(req.body.monthlyExpenses);

  const snapshot = computeSnapshot(req.companyId, overrides);
  res.json(snapshot);
});

// GET /api/analysis/ai-status — هل مفتاح Claude API مُعد أو لا (تستخدمه الواجهة لعرض حالة واضحة)
router.get("/ai-status", (req, res) => {
  res.json({ configured: isAIConfigured() });
});

// POST /api/analysis/ai-insight — يستدعي Claude API فعليًا، ويخزّن النتيجة، ويرجّعها
router.post("/ai-insight", async (req, res) => {
  const snapshot = computeSnapshot(req.companyId);

  if (!snapshot.hasData) {
    return res.status(400).json({ error: "لا توجد بيانات كافية للتحليل" });
  }

  const categoryBreakdown = getCategoryBreakdown(req.companyId);
  const result = await generateAIInsight(snapshot, categoryBreakdown);

  if (result?.error) {
    return res.status(502).json({ error: result.error });
  }

  db.prepare(
    `INSERT INTO ai_insights (company_id, summary, action_items, funding_narrative, model, generated_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(company_id) DO UPDATE SET
       summary = excluded.summary,
       action_items = excluded.action_items,
       funding_narrative = excluded.funding_narrative,
       model = excluded.model,
       generated_at = excluded.generated_at`
  ).run(req.companyId, result.summary, JSON.stringify(result.actionItems || []), result.fundingNarrative, result.model);

  const updatedSnapshot = attachCachedInsight(computeSnapshot(req.companyId), req.companyId);
  res.json(updatedSnapshot);
});

export default router;
