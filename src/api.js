// نقطة تعريف واحدة لعنوان الـ API + مساعد fetch موحّد يرفق توكن الجلسة
// تلقائيًا مع كل طلب محمي، ويتعامل مع انتهاء الجلسة بشكل مركزي.

// محليًا: يشتغل تلقائي على localhost:3001
// بعد النشر (Vercel مثلًا): عرّفي VITE_API_BASE بإعدادات المشروع
// (مثال: https://namaai-backend.onrender.com/api)
export const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3001/api";

const TOKEN_KEY = "namaai_session_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// يُطلق حدث عام لما الجلسة تنتهي أو تكون غير صالحة، عشان App.jsx يرجّع
// المستخدم لشاشة تسجيل الدخول من أي مكان بالتطبيق
function notifySessionExpired() {
  window.dispatchEvent(new Event("namaai:session-expired"));
}

// غلاف موحّد فوق fetch: يرفق هيدر x-session-token تلقائيًا، ويتعامل مع 401
export async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { ...(options.headers || {}) };

  if (token) headers["x-session-token"] = token;
  if (options.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (response.status === 401) {
    clearToken();
    notifySessionExpired();
  }

  return response;
}
