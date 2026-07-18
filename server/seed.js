// seed.js
// ====================================================================
// هذا هو الملف الوحيد في المشروع اللي فيه "بيانات اصطناعية".
// كل منطق التحليل والتنبؤ (analysis.js) لا يعرف ولا يهتم من وين جاءت
// البيانات — هو فقط يقرأ من قاعدة البيانات عبر company_id.
//
// عشان نربط النظام ببيانات حقيقية لاحقًا (Open Banking API مثلًا)، كل
// اللي يلزم هو استبدال منطق هذا الملف بمصدر بيانات حقيقي يكتب لنفس
// الجداول (companies, invoices, transactions) — قاعدة البيانات نفسها
// مبنية أصلًا لتخدم عدد غير محدود من المنشآت (company_id بكل جدول)،
// فما فيه أي تعديل بنيوي إضافي مطلوب لاحقًا لخدمة عملاء حقيقيين.
//
// التوليد مكشوف عبر REST endpoint حقيقي (POST /api/datasource/generate)
// يستدعيه المستخدم من الواجهة نفسها.
// ====================================================================

import { db, isDatabaseEmpty, setMeta } from "./db.js";
import { hashPassword } from "./auth.js";

function createSeededRandom(seed) {
  let state = seed;
  return function random() {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function randomBetween(rand, min, max) {
  return min + rand() * (max - min);
}

const COMPANY_NAMES = [
  "نماء للإلكترونيات",
  "مؤسسة الرواد للتجارة",
  "شركة البستان للتوريدات",
  "مصنع الأفق للأثاث",
  "متجر الواحة الذكي",
];

const INDUSTRIES = [
  "التقنية والبيع بالتجزئة",
  "التجارة العامة",
  "المقاولات والتوريدات",
  "الأثاث والتجهيزات",
  "التجارة الإلكترونية",
];

const CUSTOMER_NAMES = [
  "شركة الرفعة", "مؤسسة الهدى", "أكاديمية رشد", "مركز الإبداع", "متجر النخبة",
  "مؤسسة الوفاء التجارية", "شركة الأصالة", "مجموعة النور", "مؤسسة الرواسي", "شركة سنابل الخير",
];

const INCOME_CATEGORIES = ["مبيعات تجزئة", "مبيعات أونلاين", "عقود شركات"];
const EXPENSE_CATEGORIES = ["رواتب", "إيجار", "مخزون", "تسويق", "تشغيل"];

const DEMO_EMAIL = "demo@namaai.sa";
const DEMO_PASSWORD = "namaai2026";

function clearAllData() {
  db.exec("DELETE FROM sessions");
  db.exec("DELETE FROM users");
  db.exec("DELETE FROM ai_insights");
  db.exec("DELETE FROM funding_requests");
  db.exec("DELETE FROM transactions");
  db.exec("DELETE FROM invoices");
  db.exec("DELETE FROM companies");
}

function seedCompany(rand) {
  const name = COMPANY_NAMES[Math.floor(rand() * COMPANY_NAMES.length)];
  const industry = INDUSTRIES[Math.floor(rand() * INDUSTRIES.length)];

  // ملاحظة تصميم: النطاقات هنا مُعايرة عمدًا لتمثّل منشأة صغيرة تمر بضغط
  // سيولة تدريجي — عشان الديمو يقدر يوري فعليًا قدرة النظام على "التنبؤ
  // بعجز قبل حدوثه"، بغض النظر عن كم مرة تولّد بيانات جديدة.
  const currentCash = Math.round(randomBetween(rand, 6000, 12000));
  const monthlyRevenue = Math.round(randomBetween(rand, 55000, 68000));
  const monthlyExpenses = Math.round(randomBetween(rand, 68000, 78000));
  const creditLimit = 150000;
  const availableCredit = Math.round(creditLimit * randomBetween(rand, 0.1, 0.2));

  const result = db
    .prepare(
      `INSERT INTO companies (name, industry, current_cash, monthly_revenue, monthly_expenses, credit_limit, available_credit)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(name, industry, currentCash, monthlyRevenue, monthlyExpenses, creditLimit, availableCredit);

  return result.lastInsertRowid;
}

function seedDemoUser(companyId) {
  const { hash, salt } = hashPassword(DEMO_PASSWORD);
  db.prepare(
    `INSERT INTO users (email, password_hash, password_salt, company_id) VALUES (?, ?, ?, ?)`
  ).run(DEMO_EMAIL, hash, salt, companyId);
}

function seedInvoices(rand, today, companyId) {
  const stmt = db.prepare(
    `INSERT INTO invoices (id, company_id, customer, amount, due_date, status, paid_date) VALUES (?, ?, ?, ?, ?, ?, ?)`
  );

  const shuffled = [...CUSTOMER_NAMES].sort(() => rand() - 0.5);
  // نولّد عدد أكبر من الفواتير (16 بدل 6) عشان يكون فيه تاريخ تحصيل كافي
  // نحسب منه نسبة تحصيل حقيقية، بدل افتراض ثابت
  const count = 16;

  for (let i = 0; i < count; i += 1) {
    const id = `INV-${1001 + i}`;
    const customer = shuffled[i % shuffled.length];
    const amount = Math.round(randomBetween(rand, 2500, 16000));

    let status;
    let dueOffsetDays;
    let paidDate = null;
    const roll = rand();

    if (roll < 0.45) {
      // فواتير ماضية تم تحصيلها في وقتها أو بعده بقليل
      status = "مدفوعة";
      dueOffsetDays = -Math.round(randomBetween(rand, 8, 60));
      const paidOffset = Math.round(randomBetween(rand, 0, 4));
      const dueDateObj = new Date(today);
      dueDateObj.setDate(dueDateObj.getDate() + dueOffsetDays);
      const paidDateObj = new Date(dueDateObj);
      paidDateObj.setDate(paidDateObj.getDate() + paidOffset);
      paidDate = formatDate(paidDateObj);
    } else if (roll < 0.68) {
      // فواتير مستحقة بالماضي وما زالت غير محصّلة (متأخرة فعليًا)
      status = "متأخرة";
      dueOffsetDays = -Math.round(randomBetween(rand, 1, 6));
    } else {
      // فواتير مستقبلية لم يحن أجلها بعد
      status = "معلقة";
      dueOffsetDays = Math.round(randomBetween(rand, 32, 55));
    }

    const dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() + dueOffsetDays);

    stmt.run(id, companyId, customer, amount, formatDate(dueDate), status, paidDate);
  }
}

function seedTransactions(rand, today, companyId) {
  const stmt = db.prepare(
    `INSERT INTO transactions (company_id, date, type, category, amount) VALUES (?, ?, ?, ?, ?)`
  );

  const days = 90;

  for (let i = days; i >= 1; i -= 1) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = formatDate(date);

    const dailyIncome = randomBetween(rand, 1500, 2500);
    stmt.run(companyId, dateStr, "income", INCOME_CATEGORIES[Math.floor(rand() * INCOME_CATEGORIES.length)], Math.round(dailyIncome));

    // مصروف أعلى قليلًا من الدخل بثبات — نمط استنزاف تدريجي واقعي
    const dailyExpense = randomBetween(rand, 2250, 3050);
    stmt.run(companyId, dateStr, "expense", EXPENSE_CATEGORIES[Math.floor(rand() * EXPENSE_CATEGORIES.length)], Math.round(dailyExpense));
  }
}

// التوليد الرئيسي: يمسح كل البيانات ويولّد منشأة اصطناعية جديدة كاملة
// (شركة + مستخدم تجريبي + فواتير + حركات مالية).
export function generateSyntheticDataset(seed = Date.now()) {
  const rand = createSeededRandom(seed % 0x7fffffff || 42);
  const today = new Date("2026-07-14");

  let companyId;
  db.exec("BEGIN");
  try {
    clearAllData();
    companyId = seedCompany(rand);
    seedDemoUser(companyId);
    seedInvoices(rand, today, companyId);
    seedTransactions(rand, today, companyId);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  setMeta("dataSource", "synthetic");
  setMeta("generatedAt", new Date().toISOString());
  setMeta("seed", String(seed));

  return { seed, companyId, demoEmail: DEMO_EMAIL, demoPassword: DEMO_PASSWORD };
}

export function clearDataset() {
  db.exec("BEGIN");
  try {
    clearAllData();
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  setMeta("dataSource", "empty");
  setMeta("generatedAt", new Date().toISOString());
}

export function seedDatabaseIfEmpty() {
  if (!isDatabaseEmpty()) {
    return false;
  }
  generateSyntheticDataset(42);
  return true;
}

export const DEMO_CREDENTIALS = { email: DEMO_EMAIL, password: DEMO_PASSWORD };
