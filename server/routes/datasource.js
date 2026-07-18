import { Router } from "express";
import { db, getMeta } from "../db.js";
import { generateSyntheticDataset, clearDataset } from "../seed.js";

const router = Router();

// ملاحظة: هذي الصفحة تعمل على مستوى قاعدة البيانات كاملة (مو شركة محددة)
// لأنها أداة تجهيز الديمو نفسه. بمنتج حقيقي منشور، هذا المسار يُقيَّد
// لصلاحيات إدارية فقط.

function getCounts() {
  const companies = db.prepare("SELECT COUNT(*) AS c FROM companies").get().c;
  const invoices = db.prepare("SELECT COUNT(*) AS c FROM invoices").get().c;
  const transactions = db.prepare("SELECT COUNT(*) AS c FROM transactions").get().c;
  return { companies, invoices, transactions };
}

router.get("/", (req, res) => {
  res.json({
    source: getMeta("dataSource") || "غير معروف",
    generatedAt: getMeta("generatedAt"),
    seed: getMeta("seed"),
    counts: getCounts(),
  });
});

router.post("/generate", (req, res) => {
  try {
    const { seed, demoEmail, demoPassword } = generateSyntheticDataset();
    res.json({
      success: true,
      source: "synthetic",
      seed,
      generatedAt: getMeta("generatedAt"),
      counts: getCounts(),
      demoEmail,
      demoPassword,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "تعذر توليد البيانات" });
  }
});

router.delete("/", (req, res) => {
  try {
    clearDataset();
    res.json({ success: true, source: "empty", counts: getCounts() });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "تعذر مسح البيانات" });
  }
});

export default router;
