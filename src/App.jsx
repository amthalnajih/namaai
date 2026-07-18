import { useCallback, useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Liquidity from "./pages/Liquidity";
import Invoices from "./pages/Invoices";
import Recommendations from "./pages/Recommendations";
import Funding from "./pages/Funding";
import Settings from "./pages/Settings";
import DataSource from "./pages/DataSource";
import Login from "./pages/Login";
import { apiFetch, getToken, clearToken } from "./api";

const COMPANY_FIELDS = ["companyName", "industry", "monthlyRevenue", "monthlyExpenses", "currentCash"];

const EMPTY_STATE = {
  companyName: "", industry: "", currentCash: 0, monthlyRevenue: 0, monthlyExpenses: 0,
  invoices: [], outstandingInvoices: 0, overdueInvoices: 0, cashFlow: 0, projectedCash: 0,
  liquidityRatio: 0, cashRunway: 0, profitMargin: 0, financialHealthScore: 0,
  liquidityStatus: "—", riskLevel: "—", aiRecommendation: "جارِ تحميل التحليل من الخادم...",
  recommendedFunding: { amount: 0, reason: "", riskLevel: "—", monthlyInstallment: 0, fundingType: "—" },
  forecast: [], deficitDate: null, daysUntilDeficit: null,
};

export default function App() {
  const [authed, setAuthed] = useState(Boolean(getToken()));
  const [activePage, setActivePage] = useState("Dashboard");
  const [financialState, setFinancialState] = useState(EMPTY_STATE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refreshData = useCallback(async () => {
    try {
      const analysisRes = await apiFetch("/analysis");
      if (analysisRes.status === 401) return; // الحدث العام بيتكفل برجوعنا لشاشة الدخول
      if (!analysisRes.ok) throw new Error("تعذر الاتصال بالخادم");
      const analysis = await analysisRes.json();

      setFinancialState(analysis);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("تعذر الاتصال بالخادم. تأكد إن السيرفر شغال على المنفذ 3001 (npm run server).");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const handleExpired = () => {
      setAuthed(false);
      setFinancialState(EMPTY_STATE);
    };
    window.addEventListener("namaai:session-expired", handleExpired);
    return () => window.removeEventListener("namaai:session-expired", handleExpired);
  }, []);

  useEffect(() => {
    if (authed) {
      setLoading(true);
      refreshData();
    }
  }, [authed, refreshData]);

  const updateFinancialState = async (updates) => {
    setFinancialState((current) => ({ ...current, ...updates }));

    const companyUpdates = {};
    Object.keys(updates).forEach((key) => {
      if (COMPANY_FIELDS.includes(key)) companyUpdates[key] = updates[key];
    });

    if (Object.keys(companyUpdates).length === 0) return;

    try {
      await apiFetch("/company", { method: "PUT", body: JSON.stringify(companyUpdates) });
      await refreshData();
    } catch (err) {
      console.error(err);
      setError("تعذر حفظ التعديلات على الخادم.");
    }
  };

  const handleLogout = async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch (err) {
      console.error(err);
    } finally {
      clearToken();
      setAuthed(false);
      setFinancialState(EMPTY_STATE);
    }
  };

  if (!authed) {
    return <Login onLoginSuccess={() => setAuthed(true)} />;
  }

  const renderPage = () => {
    switch (activePage) {
      case "Liquidity Analysis":
        return <Liquidity financialState={financialState} />;
      case "Invoices":
        return <Invoices financialState={financialState} refreshData={refreshData} />;
      case "AI Recommendations":
        return <Recommendations financialState={financialState} refreshData={refreshData} />;
      case "Funding":
        return <Funding financialState={financialState} refreshData={refreshData} />;
      case "Data Source":
        return <DataSource onDataReset={() => { clearToken(); setAuthed(false); }} />;
      case "Settings":
        return <Settings financialState={financialState} updateFinancialState={updateFinancialState} />;
      case "Dashboard":
      default:
        return <Dashboard financialState={financialState} refreshData={refreshData} />;
    }
  };

  return (
    <div className="app-shell" dir="rtl">
      <Sidebar activePage={activePage} onSelect={setActivePage} financialState={financialState} onLogout={handleLogout} />
      <main className="main-panel">
        {error && (
          <div
            style={{
              background: "var(--coral-soft)",
              border: "1px solid rgba(255,98,89,0.35)",
              color: "#ffb3ae",
              padding: "12px 16px",
              borderRadius: "12px",
              marginBottom: "16px",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            {error}
          </div>
        )}
        {loading ? (
          <div style={{ padding: "60px", textAlign: "center", color: "var(--muted)" }}>جارِ تحميل البيانات من الخادم...</div>
        ) : (
          renderPage()
        )}
      </main>
    </div>
  );
}
