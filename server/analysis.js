// analysis.js
// ====================================================================
// محرك التحليل المالي الحتمي (Rule Engine): يقرأ من قاعدة البيانات
// ويحسب المؤشرات والتنبؤ. هذا هو "العقل الحسابي" — قابل للتفسير الكامل،
// كل رقم فيه له معادلة واضحة. الطبقة التوليدية (ai.js) تُبنى فوقه، ما
// تستبدله: القرار المالي (المبلغ، نوع التمويل) حتمي ومضبوط، والذكاء
// الاصطناعي التوليدي يشرحه بلغة طبيعية ويقترح خطوات إضافية.
//
// كل الدوال هنا تاخذ companyId — النظام يدعم عدد غير محدود من المنشآت.
// ====================================================================

import { db } from "./db.js";

const FORECAST_DAYS = 30;
const TREND_WINDOW_DAYS = 30;
const REFERENCE_DATE = new Date("2026-07-14"); // "اليوم" داخل بيانات الديمو الاصطناعية

function getCompany(companyId) {
  return db.prepare("SELECT * FROM companies WHERE id = ?").get(companyId);
}

function getInvoices(companyId) {
  return db.prepare("SELECT * FROM invoices WHERE company_id = ? ORDER BY due_date ASC").all(companyId);
}

function getRecentTransactions(companyId, days) {
  const from = new Date(REFERENCE_DATE);
  from.setDate(from.getDate() - days);
  const fromStr = from.toISOString().slice(0, 10);

  return db
    .prepare("SELECT * FROM transactions WHERE company_id = ? AND date >= ? ORDER BY date ASC")
    .all(companyId, fromStr);
}

function average(numbers) {
  if (numbers.length === 0) return 0;
  return numbers.reduce((a, b) => a + b, 0) / numbers.length;
}

function computeDailyTrend(companyId) {
  const transactions = getRecentTransactions(companyId, TREND_WINDOW_DAYS);

  const byDay = new Map();
  for (const t of transactions) {
    if (!byDay.has(t.date)) byDay.set(t.date, { income: 0, expense: 0 });
    const entry = byDay.get(t.date);
    if (t.type === "income") entry.income += t.amount;
    else entry.expense += t.amount;
  }

  const days = Array.from(byDay.values());
  const avgDailyIncome = average(days.map((d) => d.income));
  const avgDailyExpense = average(days.map((d) => d.expense));

  return { avgDailyIncome, avgDailyExpense };
}

// توزيع المصروفات/الإيرادات حسب الفئة (آخر 90 يوم) — يُستخدم كسياق إضافي
// لمحرك الذكاء الاصطناعي التوليدي عشان يعطي ملاحظات أدق من مجرد الأرقام
// الإجمالية
export function getCategoryBreakdown(companyId) {
  const transactions = getRecentTransactions(companyId, 90);
  const income = {};
  const expenses = {};

  for (const t of transactions) {
    const bucket = t.type === "income" ? income : expenses;
    bucket[t.category] = Math.round((bucket[t.category] || 0) + t.amount);
  }

  return { income, expenses };
}

function invoiceTotals(invoices) {
  const outstandingInvoices = invoices
    .filter((i) => i.status !== "مدفوعة")
    .reduce((sum, i) => sum + i.amount, 0);

  const overdueInvoices = invoices
    .filter((i) => i.status === "متأخرة")
    .reduce((sum, i) => sum + i.amount, 0);

  return { outstandingInvoices, overdueInvoices };
}

// ====================================================================
// نسبة التحصيل: تُحسب فعليًا من تاريخ الفواتير (مدفوعة مقابل متأخرة)،
// مو رقم ثابت مفترض. كل ما تراكمت بيانات أكثر، صارت النسبة أدق. لو
// البيانات التاريخية غير كافية (أقل من 3 فواتير مستحقة بالماضي)، نستخدم
// قيمة افتراضية محافظة (70%) موضّحة صراحة كـ "افتراضي مبدئي" — لا نخفي
// إنها افتراض حين تكون كذلك فعلًا.
// ====================================================================
function computeHistoricalCollectionRate(invoices) {
  const pastDueInvoices = invoices.filter((i) => i.status === "مدفوعة" || i.status === "متأخرة");

  if (pastDueInvoices.length < 3) {
    return { rate: 0.7, sampleSize: pastDueInvoices.length, isDefault: true };
  }

  const paidCount = pastDueInvoices.filter((i) => i.status === "مدفوعة").length;
  const rate = paidCount / pastDueInvoices.length;

  return { rate, sampleSize: pastDueInvoices.length, isDefault: false };
}

function buildForecast(company, invoices, collectionRate) {
  const { avgDailyIncome, avgDailyExpense } = computeDailyTrend(company.id);
  const dailyNet = avgDailyIncome - avgDailyExpense;

  let balance = company.current_cash;

  const pendingInvoices = invoices.filter((i) => i.status === "معلقة");
  const overdueInvoices = invoices.filter((i) => i.status === "متأخرة");

  // احتمال تحصيل الفاتورة المعلقة عند موعد استحقاقها = نسبة التحصيل
  // التاريخية المحسوبة فعليًا (مو رقم ثابت)
  const PENDING_COLLECTION_PROBABILITY = collectionRate.rate;
  // الفواتير المتأخرة: احتمال تحصيل أقل (خصم 40% من نسبة التحصيل العادية،
  // لأنها أصلًا تجاوزت موعد استحقاقها) موزّع خلال أول 10 أيام
  const OVERDUE_COLLECTION_PROBABILITY = collectionRate.rate * 0.6;
  const OVERDUE_COLLECTION_WINDOW = 10;

  const forecast = [];
  let deficitDate = null;
  let daysUntilDeficit = null;

  for (let day = 1; day <= FORECAST_DAYS; day += 1) {
    const date = new Date(REFERENCE_DATE);
    date.setDate(date.getDate() + day);
    const dateStr = date.toISOString().slice(0, 10);

    balance += dailyNet;

    for (const inv of pendingInvoices) {
      if (inv.due_date === dateStr) {
        balance += inv.amount * PENDING_COLLECTION_PROBABILITY;
      }
    }

    if (day <= OVERDUE_COLLECTION_WINDOW) {
      const overdueTotal = overdueInvoices.reduce((sum, i) => sum + i.amount, 0);
      balance += (overdueTotal * OVERDUE_COLLECTION_PROBABILITY) / OVERDUE_COLLECTION_WINDOW;
    }

    forecast.push({ day, date: dateStr, balance: Math.round(balance) });

    if (deficitDate === null && balance < 0) {
      deficitDate = dateStr;
      daysUntilDeficit = day;
    }
  }

  return { forecast, deficitDate, daysUntilDeficit, dailyNet, avgDailyIncome, avgDailyExpense };
}

function buildRecommendation({ financialHealthScore, cashRunway, overdueInvoices, projectedCash30, daysUntilDeficit }) {
  if (daysUntilDeficit !== null) {
    return `تحذير: النظام يتوقع عجزًا ماليًا خلال ${daysUntilDeficit} يومًا بناءً على نمط التدفق النقدي الحالي. يُنصح بطلب تمويل فوري أو تسريع تحصيل الفواتير المستحقة.`;
  }
  if (financialHealthScore >= 85) return "الوضع المالي ممتاز. ركّز على التوسع التجاري والحفاظ على احتياطي نقدي صحي.";
  if (cashRunway < 2) return "احتياطي السيولة منخفض. يُنصح بتقليل المصروفات وتسريع التحصيل فورًا.";
  if (overdueInvoices > 30000) return "فواتير متأخرة بقيمة كبيرة. يُنصح بإعطاء الأولوية لتحصيلها قبل طلب أي تمويل إضافي.";
  if (projectedCash30 < 30000) return "الرصيد المتوقع بعد 30 يوم منخفض نسبيًا. يُنصح بدراسة خيار تمويل قصير الأجل لدعم التشغيل.";
  return "الوضع المالي مستقر. استمر بمتابعة التدفق النقدي أسبوعيًا.";
}

function buildFunding({ financialHealthScore, cashRunway, daysUntilDeficit, projectedCash30 }) {
  if (daysUntilDeficit !== null && daysUntilDeficit <= 15) {
    return { amount: 150000, reason: `تمويل رأس مال عامل عاجل — النظام يتوقع عجزًا نقديًا خلال ${daysUntilDeficit} يومًا.`, riskLevel: "مرتفع", monthlyInstallment: 6200, fundingType: "تمويل سيولة طارئ" };
  }
  if (financialHealthScore >= 85) {
    return { amount: 0, reason: "السيولة قوية حاليًا. لا حاجة لتمويل إضافي.", riskLevel: "منخفض", monthlyInstallment: 0, fundingType: "لا يوجد تمويل مطلوب" };
  }
  if (cashRunway < 2) {
    return { amount: 150000, reason: "تمويل رأس مال عامل موصى به بسبب انخفاض احتياطي السيولة.", riskLevel: "مرتفع", monthlyInstallment: 6200, fundingType: "تمويل رأس مال عامل" };
  }
  if (projectedCash30 < 50000) {
    return { amount: 80000, reason: "تمويل قصير الأجل موصى به لتحسين التدفق النقدي المتوقع.", riskLevel: "متوسط", monthlyInstallment: 3200, fundingType: "تمويل قصير الأجل" };
  }
  return { amount: 40000, reason: "تمويل اختياري لدعم النمو المستقبلي.", riskLevel: "منخفض", monthlyInstallment: 1600, fundingType: "تمويل نمو" };
}

const EMPTY_SNAPSHOT = {
  hasData: false, companyName: "", industry: "", currentCash: 0, monthlyRevenue: 0, monthlyExpenses: 0,
  creditLimit: 0, availableCredit: 0, invoices: [], outstandingInvoices: 0, overdueInvoices: 0, cashFlow: 0,
  monthlyBurn: 0, collectionRate: 0, collectionRateIsDefault: true, collectionRateSampleSize: 0, debtRatio: 0,
  projectedCash: 0, liquidityRatio: 0, cashRunway: 0, profitMargin: 0, overduePercentage: 0,
  financialHealthScore: 0, liquidityStatus: "لا توجد بيانات", riskLevel: "—", forecast: [], deficitDate: null,
  daysUntilDeficit: null, avgDailyIncome: 0, avgDailyExpense: 0, dailyNet: 0,
  aiRecommendation: "لا توجد بيانات بعد. اضغط \"توليد بيانات اصطناعية\" من صفحة مصدر البيانات للبدء.",
  actionItems: [], aiGenerated: false,
  recommendedFunding: { amount: 0, reason: "لا توجد بيانات كافية.", riskLevel: "—", monthlyInstallment: 0, fundingType: "—" },
};

// overrides: تُستخدم فقط لمحاكاة "ماذا لو" (What-If) — تُطبّق مؤقتًا على
// أرقام الشركة قبل الحساب، ولا تُحفظ بقاعدة البيانات أبدًا. هذا يخلي
// أداة المحاكاة تستخدم *نفس* محرك التحليل الحقيقي بدل نسخة مبسّطة منفصلة.
export function computeSnapshot(companyId, overrides = {}) {
  const companyRow = getCompany(companyId);
  if (!companyRow) return EMPTY_SNAPSHOT;

  const company = { ...companyRow, ...overrides };
  const invoices = getInvoices(companyId);
  const { outstandingInvoices, overdueInvoices } = invoiceTotals(invoices);
  const collectionRate = computeHistoricalCollectionRate(invoices);

  const { forecast, deficitDate, daysUntilDeficit, avgDailyIncome, avgDailyExpense, dailyNet } = buildForecast(company, invoices, collectionRate);

  const projectedCash30 = forecast[forecast.length - 1].balance;
  const cashFlow = company.monthly_revenue - company.monthly_expenses;
  const monthlyBurn = company.monthly_expenses;

  const debtRatio = company.credit_limit > 0 ? ((company.credit_limit - company.available_credit) / company.credit_limit) * 100 : 0;
  const liquidityRatio = company.monthly_expenses > 0 ? projectedCash30 / company.monthly_expenses : 0;
  const cashRunway = company.monthly_expenses > 0 ? company.current_cash / company.monthly_expenses : 0;
  const profitMargin = company.monthly_revenue > 0 ? (cashFlow / company.monthly_revenue) * 100 : 0;
  const overduePercentage = outstandingInvoices > 0 ? (overdueInvoices / outstandingInvoices) * 100 : 0;

  let financialHealthScore = 100;
  if (cashRunway < 2) financialHealthScore -= 15;
  if (profitMargin < 10) financialHealthScore -= 10;
  if (overduePercentage > 30) financialHealthScore -= 25;
  if (liquidityRatio < 1) financialHealthScore -= 30;
  financialHealthScore = Math.max(0, Math.min(100, financialHealthScore));

  let liquidityStatus = "ممتاز";
  if (financialHealthScore < 40) liquidityStatus = "حرج";
  else if (financialHealthScore < 60) liquidityStatus = "تحذير";
  else if (financialHealthScore < 80) liquidityStatus = "جيد";

  const riskLevel = financialHealthScore > 80 ? "منخفض" : financialHealthScore > 60 ? "متوسط" : financialHealthScore > 40 ? "مرتفع" : "حرج";

  const snapshot = {
    hasData: true,
    companyId,
    companyName: company.name,
    industry: company.industry,
    currentCash: company.current_cash,
    monthlyRevenue: company.monthly_revenue,
    monthlyExpenses: company.monthly_expenses,
    creditLimit: company.credit_limit,
    availableCredit: company.available_credit,
    invoices: invoices.map((i) => ({ id: i.id, customer: i.customer, amount: i.amount, dueDate: i.due_date, status: i.status })),
    outstandingInvoices,
    overdueInvoices,
    cashFlow,
    monthlyBurn,
    collectionRate: collectionRate.rate * 100,
    collectionRateIsDefault: collectionRate.isDefault,
    collectionRateSampleSize: collectionRate.sampleSize,
    debtRatio,
    projectedCash: projectedCash30,
    liquidityRatio,
    cashRunway,
    profitMargin,
    overduePercentage,
    financialHealthScore,
    liquidityStatus,
    riskLevel,
    forecast,
    deficitDate,
    daysUntilDeficit,
    avgDailyIncome,
    avgDailyExpense,
    dailyNet,
    actionItems: [],
    aiGenerated: false,
  };

  snapshot.aiRecommendation = buildRecommendation(snapshot);
  snapshot.recommendedFunding = buildFunding(snapshot);

  return snapshot;
}

// يدمج تحليل الذكاء الاصطناعي المخزّن (لو موجود) فوق النتيجة الحتمية —
// النص التوليدي يستبدل النص المبني على القوالب، لكن الأرقام تبقى كما هي
export function attachCachedInsight(snapshot, companyId) {
  const cached = db.prepare("SELECT * FROM ai_insights WHERE company_id = ?").get(companyId);
  if (!cached) return snapshot;

  return {
    ...snapshot,
    aiRecommendation: cached.summary || snapshot.aiRecommendation,
    actionItems: cached.action_items ? JSON.parse(cached.action_items) : [],
    aiGenerated: true,
    aiGeneratedAt: cached.generated_at,
    recommendedFunding: {
      ...snapshot.recommendedFunding,
      reason: cached.funding_narrative || snapshot.recommendedFunding.reason,
    },
  };
}

export function buildRecommendationList(snapshot) {
  if (!snapshot.hasData) {
    return ["لا توجد بيانات بعد. اضغط \"توليد بيانات اصطناعية\" من صفحة مصدر البيانات للبدء."];
  }

  if (snapshot.aiGenerated && snapshot.actionItems.length > 0) {
    return snapshot.actionItems;
  }

  const list = [];
  if (snapshot.daysUntilDeficit !== null) list.push(`🔴 توقع عجز مالي خلال ${snapshot.daysUntilDeficit} يومًا — تصرف الآن لتفادي نقص السيولة.`);
  if (snapshot.financialHealthScore >= 85) list.push("✅ الصحة المالية ممتازة. لا حاجة لتمويل فوري.");
  else if (snapshot.financialHealthScore >= 60) list.push("🟡 الصحة المالية مستقرة، لكن يُنصح بتحسين الاحتياطي النقدي.");
  else list.push("🔴 الصحة المالية ضعيفة. راجع المصروفات وحسّن السيولة.");
  if (snapshot.cashRunway < 2) list.push("⚠️ احتياطي السيولة أقل من شهرين. فكّر بتمويل قصير الأجل.");
  if (snapshot.profitMargin < 15) list.push("📉 هامش الربح منخفض. قلّل المصروفات التشغيلية.");
  if (snapshot.overdueInvoices > 0) list.push(`💰 حصّل الفواتير المتأخرة بقيمة ${snapshot.overdueInvoices.toLocaleString("en-SA")} ر.س.`);
  if (snapshot.outstandingInvoices > 50000) list.push("📑 الفواتير المستحقة مرتفعة. حسّن كفاءة التحصيل.");
  list.push(snapshot.cashFlow > 0 ? "📈 التدفق النقدي إيجابي. وقت مناسب لبناء احتياطي نقدي." : "📉 التدفق النقدي سلبي. أجّل أي إنفاق غير ضروري.");
  if (snapshot.recommendedFunding.amount > 0) list.push(`🏦 تمويل موصى به: ${snapshot.recommendedFunding.amount.toLocaleString("en-SA")} ر.س (${snapshot.recommendedFunding.fundingType}).`);
  return list;
}
