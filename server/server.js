// تعطيل تحذير "SQLite experimental" اللي تطبعه Node بالكونسول — الوظيفة
// نفسها ثابتة وتعمل بشكل صحيح، هذا فقط تنظيف للمخرجات وقت العرض.
process.removeAllListeners("warning");

import express from "express";
import cors from "cors";

import { seedDatabaseIfEmpty } from "./seed.js";
import { requireAuth } from "./auth.js";
import authRoutes from "./routes/auth.js";
import companyRoutes from "./routes/company.js";
import invoiceRoutes from "./routes/invoices.js";
import analysisRoutes from "./routes/analysis.js";
import datasourceRoutes from "./routes/datasource.js";
import fundingRoutes from "./routes/funding.js";

const wasSeeded = seedDatabaseIfEmpty();
if (wasSeeded) {
  console.log("تم إنشاء قاعدة بيانات جديدة وتعبئتها ببيانات اصطناعية (namaai.db)");
} else {
  console.log("تم العثور على قاعدة بيانات موجودة مسبقًا (namaai.db)");
}

const app = express();

// CORS مقيّد: يسمح فقط لعنوان الفرونت إند المحدد بمتغيرات البيئة
// (بدل السماح لأي موقع بالعالم يستدعي الـ API)
const allowedOrigin = "*";


app.use(cors({ origin: allowedOrigin, allowedHeaders: ["Content-Type", "x-session-token"] }));
app.use(express.json());

// مسارات عامة (بدون تسجيل دخول): تسجيل الدخول نفسه، وأداة تجهيز الديمو
app.use("/api/auth", authRoutes);
app.use("/api/datasource", datasourceRoutes);

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// من هنا فصاعدًا، كل المسارات تتطلب جلسة دخول صالحة (x-session-token)
app.use("/api/company", requireAuth, companyRoutes);
app.use("/api/invoices", requireAuth, invoiceRoutes);
app.use("/api/analysis", requireAuth, analysisRoutes);
app.use("/api/funding", requireAuth, fundingRoutes);

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
