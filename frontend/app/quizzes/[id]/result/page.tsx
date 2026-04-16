"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { quiz } from "../../../lib/client";

export default function ResultPage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);
  const [result, setResult] = useState<quiz.SubmitResult | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(`result_${id}`);
    if (!stored) { router.push("/quizzes"); return; }
    setResult(JSON.parse(stored));
  }, []);

  if (!result) return <div style={s.center}>Загрузка...</div>;

  const passed = result.passed;
  const hasPassed = passed !== null && passed !== undefined;

  return (
    <div style={s.container}>
      <div style={{ ...s.resultBanner, background: hasPassed ? (passed ? "#dcfce7" : "#fee2e2") : "#eff6ff" }}>
        <div style={s.bigScore}>{result.score}/{result.total}</div>
        <div style={s.percentage}>{result.percentage}%</div>
        {hasPassed && (
          <div style={{ ...s.verdict, color: passed ? "#16a34a" : "#dc2626" }}>
            {passed ? "✓ Тест пройден!" : "✗ Тест не пройден"}
          </div>
        )}
      </div>

      {result.show_answers && result.answers && result.answers.length > 0 && (
        <div style={s.answersSection}>
          <h2 style={s.sectionTitle}>Разбор ошибок</h2>
          {result.answers.map((a, i) => (
            <div key={i} style={{ ...s.answerCard, borderLeft: `4px solid ${a.is_correct ? "#16a34a" : "#dc2626"}` }}>
              <p style={s.questionText}><strong>Вопрос {i + 1}:</strong> {a.question_text}</p>
              <p style={s.yourAnswer}>Ваш ответ: <span style={{ color: a.is_correct ? "#16a34a" : "#dc2626" }}>{a.selected_answer}</span></p>
              {!a.is_correct && <p style={s.correctAnswer}>Правильный: <span style={{ color: "#16a34a" }}>{a.correct_answer}</span></p>}
            </div>
          ))}
        </div>
      )}

      <button style={s.backBtn} onClick={() => router.push("/quizzes")}>← К списку квизов</button>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  container: { maxWidth: "700px", margin: "0 auto", padding: "32px 16px" },
  center: { textAlign: "center", padding: "40px" },
  resultBanner: { borderRadius: "16px", padding: "40px", textAlign: "center", marginBottom: "32px" },
  bigScore: { fontSize: "64px", fontWeight: "bold", color: "#1a1a2e" },
  percentage: { fontSize: "24px", color: "#6b7280", marginTop: "8px" },
  verdict: { fontSize: "22px", fontWeight: "bold", marginTop: "16px" },
  answersSection: { marginBottom: "24px" },
  sectionTitle: { fontSize: "20px", margin: "0 0 16px", color: "#1a1a2e" },
  answerCard: { background: "white", borderRadius: "8px", padding: "16px", marginBottom: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" },
  questionText: { margin: "0 0 8px", fontSize: "15px" },
  yourAnswer: { margin: "0 0 4px", fontSize: "14px", color: "#374151" },
  correctAnswer: { margin: 0, fontSize: "14px", color: "#374151" },
  backBtn: { display: "block", width: "100%", padding: "14px", background: "#4f46e5", color: "white", border: "none", borderRadius: "10px", cursor: "pointer", fontSize: "16px", fontWeight: "bold" },
};
