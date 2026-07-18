// ai.js
// ====================================================================
// هذا هو الجزء "التوليدي" الفعلي بالمشروع — استدعاء حقيقي لـ Claude API
// (مو قوالب نصية جاهزة). محرك القواعد بـ analysis.js يحسب الأرقام
// (الصحة المالية، التنبؤ، مبلغ التمويل) بشكل حتمي وقابل للتفسير، وهذي
// الوحدة تاخذ نفس الأرقام وتطلب من نموذج Claude يحللها ويكتب توصية
// بلغة طبيعية + خطوات عملية — طبقة توليدية فوق محرك قرار حتمي، مو بديل
// عنه (قرار مبني على قواعد واضحة + شرح مولّد بالذكاء الاصطناعي).
//
// يستخدم fetch المدمجة في Node.js (>=18) — بدون أي SDK خارجي.
// ====================================================================

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-5";

export function isAIConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function buildPrompt(snapshot, categoryBreakdown) {
  const deficitLine =
    snapshot.daysUntilDeficit !== null && snapshot.daysUntilDeficit !== undefined
      ? `تنبؤ رياضي: عجز نقدي متوقع خلال ${snapshot.daysUntilDeficit} يومًا (بتاريخ ${snapshot.deficitDate}) إذا استمر النمط الحالي للتدفق النقدي.`
      : "لا يوجد عجز نقدي متوقع خلال الـ 30 يومًا القادمة وفق النمط الحالي.";

  return `أنت مستشار مالي خبير ضمن منصة "نماء AI" — مستشار سيولة ذكي داخل بوابة مصرف الإنماء للمنشآت الصغيرة والمتوسطة (SMEs) بالسعودية.

بيانات المنشأة (محسوبة فعليًا من قاعدة بيانات المعاملات، وليست افتراضية):
- الاسم: ${snapshot.companyName} — القطاع: ${snapshot.industry}
- الرصيد النقدي الحالي: ${Math.round(snapshot.currentCash).toLocaleString("en-US")} ر.س
- الإيراد الشهري: ${Math.round(snapshot.monthlyRevenue).toLocaleString("en-US")} ر.س
- المصروفات الشهرية: ${Math.round(snapshot.monthlyExpenses).toLocaleString("en-US")} ر.س
- التدفق النقدي الشهري الصافي: ${Math.round(snapshot.cashFlow).toLocaleString("en-US")} ر.س
- مؤشر الصحة المالية: ${snapshot.financialHealthScore}/100 (${snapshot.liquidityStatus}) — مستوى الخطر: ${snapshot.riskLevel}
- احتياطي السيولة: ${snapshot.cashRunway.toFixed(1)} شهر
- هامش الربح: ${snapshot.profitMargin.toFixed(1)}%
- إجمالي الفواتير المستحقة: ${Math.round(snapshot.outstandingInvoices).toLocaleString("en-US")} ر.س، منها متأخر: ${Math.round(snapshot.overdueInvoices).toLocaleString("en-US")} ر.س
- نسبة التحصيل الفعلية المحسوبة من تاريخ الفواتير: ${snapshot.collectionRate.toFixed(1)}%
- ${deficitLine}
- التمويل المقترح من محرك القواعد: ${snapshot.recommendedFunding.amount > 0 ? `${Math.round(snapshot.recommendedFunding.amount).toLocaleString("en-US")} ر.س (${snapshot.recommendedFunding.fundingType})` : "لا يوجد تمويل مطلوب حاليًا"}

توزيع المصروفات حسب الفئة (آخر 90 يوم، بالريال): ${JSON.stringify(categoryBreakdown.expenses)}
توزيع الإيرادات حسب الفئة (آخر 90 يوم، بالريال): ${JSON.stringify(categoryBreakdown.income)}

المطلوب: حلّل هذي البيانات فقط (لا تخترع أرقامًا أو حقائق غير مذكورة أعلاه)، واكتب تحليلًا عمليًا موجهًا لصاحب المنشأة مباشرة. أجب حصرًا بصيغة JSON صالحة، بدون أي نص أو شرح خارج الـ JSON، وبدون Markdown، بالشكل التالي بالضبط:

{
  "summary": "فقرة من جملتين إلى ثلاث جمل بالعربية الفصحى السهلة، تلخّص الوضع المالي وأهم خطوة يجب اتخاذها الآن",
  "actionItems": ["إجراء عملي محدد ومختصر 1", "إجراء عملي محدد ومختصر 2", "إجراء عملي محدد ومختصر 3"],
  "fundingNarrative": "جملة إلى جملتين تشرحان — بالاستناد لبيانات الفئات أعلاه إن أمكن — سبب اقتراح هذا التمويل بالذات أو عدم الحاجة له"
}`;
}

// يستدعي Claude API فعليًا. يرجّع null (بدل ما يرمي استثناء) لو المفتاح
// غير موجود أو الاستدعاء فشل — عشان الواجهة ترجع تلقائيًا للتحليل المبني
// على القواعد (fallback)، وما ينهار المشروع وقت العرض لو صار خلل بالشبكة.
export async function generateAIInsight(snapshot, categoryBreakdown) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { error: "ANTHROPIC_API_KEY غير موجود في ملف .env" };
  }

  const prompt = buildPrompt(snapshot, categoryBreakdown);

  let response;
  try {
    response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 700,
        messages: [{ role: "user", content: prompt }],
      }),
    });
  } catch (networkError) {
    console.error("Anthropic API network error:", networkError.message);
    return { error: "تعذر الاتصال بخادم Claude API (تحقق من الإنترنت)" };
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    console.error("Anthropic API error:", response.status, errText);
    return { error: `خطأ من Claude API (${response.status}) — تحقق من صلاحية المفتاح والرصيد` };
  }

  const data = await response.json();
  const textBlock = Array.isArray(data.content) ? data.content.find((b) => b.type === "text") : null;
  if (!textBlock) {
    return { error: "رد غير متوقع من Claude API" };
  }

  const cleaned = textBlock.text.replace(/```json|```/g, "").trim();

  try {
    const parsed = JSON.parse(cleaned);
    return {
      summary: parsed.summary,
      actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
      fundingNarrative: parsed.fundingNarrative,
      model: MODEL,
    };
  } catch (parseError) {
    console.error("Failed to parse AI JSON response:", cleaned);
    return { error: "تعذر تفسير رد النموذج" };
  }
}
