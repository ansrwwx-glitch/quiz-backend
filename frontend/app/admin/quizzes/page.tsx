"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getClient, getRole, clearAuth } from "../../lib/api";
import { admin } from "../../lib/client";

export default function AdminQuizzesPage() {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<admin.QuizListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (getRole() !== "admin") {
      router.push("/login");
      return;
    }
    loadQuizzes();
  }, []);

  async function loadQuizzes() {
    try {
      const client = getClient();
      const res = await client.admin.ListQuizzes();
      setQuizzes(res.quizzes ?? []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Удалить квиз?")) return;
    try {
      await getClient().admin.DeleteQuiz(id);
      setQuizzes(quizzes.filter((q) => q.id !== id));
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function handleTogglePublish(id: number) {
    try {
      const res = await getClient().admin.TogglePublish(id);
      setQuizzes(quizzes.map((q) =>
        q.id === id ? { ...q, is_published: res.is_published } : q
      ));
    } catch (e: any) {
      alert(e.message);
    }
  }

  function handleLogout() {
    clearAuth();
    router.push("/login");
  }

  if (loading) return <div style={styles.center}>Загрузка...</div>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Мои квизы</h1>
        <div style={{ display: "flex", gap: "12px" }}>
          <button style={styles.createBtn} onClick={() => router.push("/admin/quizzes/new")}>
            + Создать квиз
          </button>
          <button style={styles.logoutBtn} onClick={handleLogout}>
            Выйти
          </button>
        </div>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {quizzes.length === 0 ? (
        <div style={styles.empty}>Квизов пока нет. Создайте первый!</div>
      ) : (
        <div style={styles.grid}>
          {quizzes.map((quiz) => (
            <div key={quiz.id} style={styles.card}>
              <div style={styles.cardTop}>
                <h3 style={styles.quizTitle}>{quiz.title}</h3>
                <span style={quiz.is_published ? styles.published : styles.draft}>
                  {quiz.is_published ? "Опубликован" : "Черновик"}
                </span>
              </div>
              <p style={styles.meta}>{quiz.question_count} вопросов</p>
              <div style={styles.actions}>
                <button style={styles.editBtn} onClick={() => router.push(`/admin/quizzes/${quiz.id}/edit`)}>
                  Редактировать
                </button>
                <button
                  style={quiz.is_published ? styles.hideBtn : styles.publishBtn}
                  onClick={() => handleTogglePublish(quiz.id)}
                >
                  {quiz.is_published ? "Скрыть" : "Опубликовать"}
                </button>
                <button style={styles.deleteBtn} onClick={() => handleDelete(quiz.id)}>
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { maxWidth: "900px", margin: "0 auto", padding: "32px 16px" },
  center: { textAlign: "center", padding: "40px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" },
  title: { margin: 0, fontSize: "28px", color: "#1a1a2e" },
  createBtn: { padding: "10px 20px", background: "#4f46e5", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" },
  logoutBtn: { padding: "10px 20px", background: "#6b7280", color: "white", border: "none", borderRadius: "8px", cursor: "pointer" },
  error: { background: "#fee2e2", color: "#dc2626", padding: "12px", borderRadius: "8px", marginBottom: "16px" },
  empty: { textAlign: "center", padding: "60px", color: "#6b7280", fontSize: "18px" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" },
  card: { background: "white", borderRadius: "12px", padding: "20px", boxShadow: "0 2px 10px rgba(0,0,0,0.08)" },
  cardTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" },
  quizTitle: { margin: 0, fontSize: "18px", color: "#1a1a2e" },
  published: { background: "#dcfce7", color: "#16a34a", padding: "4px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold" },
  draft: { background: "#f3f4f6", color: "#6b7280", padding: "4px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold" },
  meta: { color: "#6b7280", fontSize: "14px", margin: "0 0 16px" },
  actions: { display: "flex", gap: "8px", flexWrap: "wrap" },
  editBtn: { padding: "6px 12px", background: "#eff6ff", color: "#3b82f6", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px" },
  publishBtn: { padding: "6px 12px", background: "#f0fdf4", color: "#16a34a", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px" },
  hideBtn: { padding: "6px 12px", background: "#fefce8", color: "#ca8a04", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px" },
  deleteBtn: { padding: "6px 12px", background: "#fef2f2", color: "#dc2626", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px" },
};
