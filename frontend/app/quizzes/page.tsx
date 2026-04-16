"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getClient, clearAuth, isLoggedIn } from "../lib/api";
import { quiz } from "../lib/client";

export default function QuizzesPage() {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<quiz.QuizListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoggedIn()) { router.push("/login"); return; }
    getClient().quiz.ListQuizzes().then((res) => setQuizzes(res.quizzes ?? [])).catch((e: any) => setError(e.message)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={s.center}>Загрузка...</div>;

  return (
    <div style={s.container}>
      <div style={s.header}>
        <h1 style={s.title}>Доступные квизы</h1>
        <button style={s.logoutBtn} onClick={() => { clearAuth(); router.push("/login"); }}>Выйти</button>
      </div>
      {error && <div style={s.error}>{error}</div>}
      {quizzes.length === 0 ? (
        <div style={s.empty}>Квизов пока нет</div>
      ) : (
        <div style={s.grid}>
          {quizzes.map((q) => (
            <div key={q.id} style={s.card}>
              <h3 style={s.quizTitle}>{q.title}</h3>
              <p style={s.meta}>{q.question_count} вопросов</p>
              {q.attempted && <span style={s.attempted}>Пройден</span>}
              <button style={q.attempted ? s.retryBtn : s.startBtn} onClick={() => router.push(`/quizzes/${q.id}`)}>
                {q.attempted ? "Пройти снова" : "Начать"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  container: { maxWidth: "900px", margin: "0 auto", padding: "32px 16px" },
  center: { textAlign: "center", padding: "40px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" },
  title: { margin: 0, fontSize: "28px", color: "#1a1a2e" },
  logoutBtn: { padding: "10px 20px", background: "#6b7280", color: "white", border: "none", borderRadius: "8px", cursor: "pointer" },
  error: { background: "#fee2e2", color: "#dc2626", padding: "12px", borderRadius: "8px", marginBottom: "16px" },
  empty: { textAlign: "center", padding: "60px", color: "#6b7280", fontSize: "18px" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" },
  card: { background: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 2px 10px rgba(0,0,0,0.08)", display: "flex", flexDirection: "column", gap: "12px" },
  quizTitle: { margin: 0, fontSize: "18px", color: "#1a1a2e" },
  meta: { margin: 0, color: "#6b7280", fontSize: "14px" },
  attempted: { background: "#dcfce7", color: "#16a34a", padding: "4px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold", alignSelf: "flex-start" },
  startBtn: { padding: "10px", background: "#4f46e5", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" },
  retryBtn: { padding: "10px", background: "#f3f4f6", color: "#374151", border: "none", borderRadius: "8px", cursor: "pointer" },
};
