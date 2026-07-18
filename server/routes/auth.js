import { Router } from "express";
import { db } from "../db.js";
import { verifyPassword, createSession, destroySession, requireAuth } from "../auth.js";

const router = Router();

router.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "البريد الإلكتروني وكلمة المرور مطلوبان" });
  }

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email.trim().toLowerCase());

  if (!user || !verifyPassword(password, user.password_salt, user.password_hash)) {
    return res.status(401).json({ error: "بيانات الدخول غير صحيحة" });
  }

  const { token, expiresAt } = createSession(user.id);
  res.json({ token, expiresAt, user: { id: user.id, email: user.email, companyId: user.company_id } });
});

router.post("/logout", requireAuth, (req, res) => {
  destroySession(req.headers["x-session-token"]);
  res.json({ success: true });
});

router.get("/me", requireAuth, (req, res) => {
  const company = db.prepare("SELECT name FROM companies WHERE id = ?").get(req.companyId);
  res.json({ userId: req.userId, companyId: req.companyId, companyName: company?.name });
});

export default router;
