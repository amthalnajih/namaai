// db.js
// طبقة الاتصال بقاعدة البيانات + تعريف الجداول (Schema)
//
// نستخدم وحدة node:sqlite المدمجة داخل Node.js (>=22.5) بدل مكتبة خارجية.
//
// ملاحظة تصميم مهمة: كل جدول بيانات (invoices, transactions) مرتبط بـ
// company_id — يعني قاعدة البيانات هذي مبنية من الأساس لتخدم عدد غير
// محدود من المنشآت (زي أي بنك حقيقي يخدم آلاف الـ SMEs)، مو منشأة واحدة
// فقط. بالديمو نعرض منشأة وحدة (لأنها الوحيدة المتوفرة اصطناعيًا)، لكن
// البنية جاهزة فعليًا لاستقبال بيانات حقيقية متعددة العملاء بدون أي
// تعديل بنيوي إضافي.

import { DatabaseSync } from "node:sqlite";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "namaai.db");

export const db = new DatabaseSync(DB_PATH);

db.exec("PRAGMA foreign_keys = ON;");

db.exec(`
CREATE TABLE IF NOT EXISTS companies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  industry TEXT NOT NULL,
  current_cash REAL NOT NULL,
  monthly_revenue REAL NOT NULL,
  monthly_expenses REAL NOT NULL,
  credit_limit REAL NOT NULL DEFAULT 0,
  available_credit REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer TEXT NOT NULL,
  amount REAL NOT NULL,
  due_date TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('مدفوعة', 'معلقة', 'متأخرة')),
  paid_date TEXT
);

CREATE INDEX IF NOT EXISTS idx_invoices_company ON invoices(company_id);

-- سجل يومي للحركات المالية (دخل/مصروف) — أساس التنبؤ بالعجز خلال 30 يوم
CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category TEXT NOT NULL,
  amount REAL NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_transactions_company_date ON transactions(company_id, date);

-- طلبات التمويل الفعلية (يُنشئها المستخدم من صفحة التمويل)
CREATE TABLE IF NOT EXISTS funding_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  reference_number TEXT NOT NULL UNIQUE,
  amount REAL NOT NULL,
  funding_type TEXT NOT NULL,
  risk_level TEXT,
  monthly_installment REAL,
  status TEXT NOT NULL DEFAULT 'قيد المراجعة',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_funding_company ON funding_requests(company_id);

-- المستخدمون (تسجيل الدخول) — كل مستخدم مرتبط بمنشأة واحدة
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- جلسات الدخول (توكن بسيط، بدون مكتبات خارجية)
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);

-- جدول تعريفي صغير: يتتبع مصدر البيانات الحالي (اصطناعي/حقيقي)
CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- تحليل الذكاء الاصطناعي التوليدي المولّد فعليًا عبر Claude API (مخزّن
-- كـ cache — يتولّد عند الطلب الصريح من الواجهة، مو باستمرار، توفيرًا
-- للتكلفة والوقت)
CREATE TABLE IF NOT EXISTS ai_insights (
  company_id INTEGER PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
  summary TEXT,
  action_items TEXT,
  funding_narrative TEXT,
  model TEXT,
  generated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

export function getMeta(key) {
  const row = db.prepare("SELECT value FROM meta WHERE key = ?").get(key);
  return row ? row.value : null;
}

export function setMeta(key, value) {
  db.prepare(
    `INSERT INTO meta (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(key, value);
}

export function isDatabaseEmpty() {
  const row = db.prepare("SELECT COUNT(*) AS count FROM companies").get();
  return row.count === 0;
}
