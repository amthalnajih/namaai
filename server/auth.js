// auth.js
// طبقة مصادقة بسيطة وآمنة، مبنية بالكامل على وحدة crypto المدمجة في
// Node.js — بدون أي مكتبة خارجية (لا bcrypt ولا jsonwebtoken). هذا خيار
// مقصود: يقلل نقاط الفشل عند التثبيت، ويبقي المنطق شفافًا وقابلًا للمراجعة.
//
// - كلمات المرور: تُشفّر بـ scrypt (خوارزمية قياسية موصى بها لتشفير كلمات
//   المرور، مقاومة لهجمات GPU) مع "ملح" (salt) عشوائي لكل مستخدم.
// - الجلسات: توكن عشوائي 256-بت يُخزّن بقاعدة البيانات مع تاريخ انتهاء،
//   يُرسل من الواجهة بهيدر `x-session-token` مع كل طلب محمي.

import crypto from "crypto";
import { db } from "./db.js";

const SESSION_TTL_HOURS = 24 * 7; // أسبوع

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { hash, salt };
}

export function verifyPassword(password, salt, expectedHash) {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(expectedHash, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function createSession(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000).toISOString();
  db.prepare(`INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)`).run(token, userId, expiresAt);
  return { token, expiresAt };
}

export function destroySession(token) {
  db.prepare(`DELETE FROM sessions WHERE token = ?`).run(token);
}

// يرجّع بيانات المستخدم + الشركة المرتبطة به إذا كانت الجلسة صالحة، وإلا null
export function getSessionUser(token) {
  if (!token) return null;

  const session = db.prepare(`SELECT * FROM sessions WHERE token = ?`).get(token);
  if (!session) return null;

  if (new Date(session.expires_at).getTime() < Date.now()) {
    destroySession(token);
    return null;
  }

  const user = db.prepare(`SELECT id, email, company_id FROM users WHERE id = ?`).get(session.user_id);
  return user || null;
}

// Middleware لحماية أي مسار — يتطلب هيدر x-session-token صالح
// ويضيف req.companyId و req.userId للطلب
export function requireAuth(req, res, next) {
  const token = req.headers["x-session-token"];
  const user = getSessionUser(token);

  if (!user) {
    return res.status(401).json({ error: "غير مصرح — يرجى تسجيل الدخول" });
  }

  req.userId = user.id;
  req.companyId = user.company_id;
  next();
}
