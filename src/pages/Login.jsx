import { useState } from "react";
import { API_BASE, setToken } from "../api";

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState("demo@namaai.sa");
  const [password, setPassword] = useState("namaai2026");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "تعذر تسجيل الدخول");
        return;
      }

      setToken(data.token);
      onLoginSuccess();
    } catch (err) {
      console.error(err);
      setError("تعذر الاتصال بالخادم. تأكد إن السيرفر شغال (npm run server).");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      dir="rtl"
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background:
          "radial-gradient(1100px 700px at 12% -10%, rgba(205,164,95,0.10) 0%, transparent 60%), radial-gradient(900px 600px at 100% 0%, rgba(53,217,166,0.07) 0%, transparent 55%), var(--ink-900)",
        padding: "20px",
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="card"
        style={{ width: "100%", maxWidth: "380px", padding: "32px 28px" }}
      >
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div className="brand-badge" style={{ margin: "0 auto 14px" }}>✦</div>
          <h1 className="page-title" style={{ fontSize: "22px" }}>نماء AI</h1>
          <p className="eyebrow" style={{ marginTop: "6px" }}>مستشار السيولة الذكي — بوابة المنشآت</p>
        </div>

        <label className="field-label" htmlFor="email">البريد الإلكتروني</label>
        <input
          id="email"
          type="email"
          className="field-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ marginBottom: "14px" }}
          required
        />

        <label className="field-label" htmlFor="password">كلمة المرور</label>
        <input
          id="password"
          type="password"
          className="field-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ marginBottom: "18px" }}
          required
        />

        {error && (
          <p style={{ color: "var(--coral)", fontSize: "13px", fontWeight: 600, marginBottom: "14px" }}>{error}</p>
        )}

        <button type="submit" className="primary-button" style={{ width: "100%" }} disabled={loading}>
          {loading ? "جارٍ الدخول..." : "تسجيل الدخول"}
        </button>

        <p className="hero-text" style={{ marginTop: "18px", fontSize: "12px", textAlign: "center" }}>
          بيانات دخول تجريبية معبأة مسبقًا (مستخدم اصطناعي مربوط بمنشأة توليدية). لو ما فيه بيانات، شغّل السيرفر أول مرة ليتولّد المستخدم تلقائيًا.
        </p>
      </form>
    </div>
  );
}
