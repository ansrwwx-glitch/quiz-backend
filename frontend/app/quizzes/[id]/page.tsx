"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { getClient, isLoggedIn } from "../../lib/api";
import { quiz } from "../../lib/client";

export default function QuizPage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);
  const [quizData, setQuizData] = useState<quiz.QuizDetail | null>(null);
  const [selected, setSelected] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoggedIn()) { router.push("/login"); return; }
    getClient().quiz.GetQuiz(id).then(setQuizData).catch((e: any) => setError(e.message)).finally(() => setLoading(false));
  }, []);

  async function handleSubmit() {
    if (!quizData) return;
    const unanswered = quizData.questions.filter((q) => selected[q.id] === undefined);
    if (unanswered.length > 0) { setError("Ответьте на все вопросы"); return; }
    setSubmitting(true);
    try {
      const answers = quizData.questions.map((q) => ({ question_id: q.id, answer_id: selected[q.id] }));
      const result = await getClient().quiz.SubmitQuiz(id, { answers });
      localStorage.setItem(`result_${id}`, JSON.stringify(result));
      router.push(`/quizzes/${id}/result`);
    } catch (e: any) { setError(e.message); }
    finally { setSubmitting(false); }
  }

  if (loading) return <div style={s.center}>Загрузка...</div>;
  if (error) return <div style={s.center}><div style={s.error}>{error}</div><button onClick={() => router.push("/quizzes")}>← Назад</button></div>;
  if (!quizData) return null;

  return (
    <div style={s.container}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={() => router.push("/quizzes")}>← Назад</button>
        <h1 style={s.title}>{quizData.title}</h1>
      </div>
      {quizData.questions.map((q, qi) => (
        <div key={q.id} style={s.questionCard}>
          <p style={s.questionText}><strong>Вопрос {qi + 1}.</strong> {q.text}</p>
          <div style={s.answers}>
            {q.answers.map((a) => (
              <label key={a.id} style={{ ...s.answerLabel, background: selected[q.id] === a.id ? "#ede9fe" : "white", borderColor: selected[q.id] === a.id ? "#4f46e5" : "#e5e7eb" }}>
                <input type="radio" name={`q_${q.id}`} checked={selected[q.id] === a.id} onChange={() => setSelected({ ...selected, [q.id]: a.id })} />
                {a.text}
              </label>
            ))}
          </div>
        </div>
      ))}
      {error && <div style={s.error}>{error}</div>}
      <button style={s.submitBtn} onClick={handleSubmit} disabled={submitting}>
        {submitting ? "Отправка..." : "Завершить квиз"}
      </button>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  container: { maxWidth: "700px", margin: "0 auto", padding: "32px 16px" },
  center: { textAlign: "center", padding: "40px" },
  header: { display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px" },
  backBtn: { background: "none", border: "1px solid #ddd", borderRadius: "8px", padding: "8px 16px", cursor: "pointer" },
  title: { margin: 0, fontSize: "24px", color: "#1a1a2e" },
  questionCard: { background: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 2px 10px rgba(0,0,0,0.08)", marginBottom: "16px" },
  questionText: { margin: "0 0 16px", fontSize: "16px", color: "#1a1a2e" },
  answers: { display: "flex", flexDirection: "column", gap: "10px" },
  answerLabel: { display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", borderRadius: "8px", border: "2px solid #e5e7eb", cursor: "pointer", fontSize: "15px" },
  error: { background: "#fee2e2", color: "#dc2626", padding: "12px", borderRadius: "8px", marginBottom: "16px" },
  submitBtn: { display: "block", width: "100%", padding: "14px", background: "#4f46e5", color: "white", border: "none", borderRadius: "10px", cursor: "pointer", fontSize: "16px", fontWeight: "bold", marginTop: "8px" },
};
