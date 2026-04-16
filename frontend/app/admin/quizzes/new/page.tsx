"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getClient } from "../../../lib/api";

interface Answer { id: number; text: string; is_correct: boolean; order_index: number; }
interface Question { id: number; text: string; order_index: number; answers: Answer[]; }

const emptyAnswer = (idx: number): Answer => ({ id: 0, text: "", is_correct: false, order_index: idx });
const emptyQuestion = (idx: number): Question => ({ id: 0, text: "", order_index: idx, answers: [emptyAnswer(1), emptyAnswer(2)] });

export default function NewQuizPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [passThreshold, setPassThreshold] = useState(0);
  const [oneAttempt, setOneAttempt] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([emptyQuestion(1)]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function addQuestion() { setQuestions([...questions, emptyQuestion(questions.length + 1)]); }
  function removeQuestion(qi: number) { setQuestions(questions.filter((_, i) => i !== qi)); }
  function updateQuestion(qi: number, text: string) { setQuestions(questions.map((q, i) => i === qi ? { ...q, text } : q)); }
  function addAnswer(qi: number) { setQuestions(questions.map((q, i) => i === qi ? { ...q, answers: [...q.answers, emptyAnswer(q.answers.length + 1)] } : q)); }
  function updateAnswer(qi: number, ai: number, text: string) { setQuestions(questions.map((q, i) => i === qi ? { ...q, answers: q.answers.map((a, j) => j === ai ? { ...a, text } : a) } : q)); }
  function setCorrect(qi: number, ai: number) { setQuestions(questions.map((q, i) => i === qi ? { ...q, answers: q.answers.map((a, j) => ({ ...a, is_correct: j === ai })) } : q)); }
  function removeAnswer(qi: number, ai: number) { setQuestions(questions.map((q, i) => i === qi ? { ...q, answers: q.answers.filter((_, j) => j !== ai) } : q)); }

  async function handleSave() {
    setError("");
    if (!title.trim()) { setError("Введите название"); return; }
    for (const q of questions) {
      if (!q.text.trim()) { setError("Заполните текст всех вопросов"); return; }
      if (!q.answers.some((a) => a.is_correct)) { setError("Выберите правильный ответ для каждого вопроса"); return; }
    }
    setSaving(true);
    try {
      await getClient().admin.CreateQuiz({ title, is_published: isPublished, pass_threshold: passThreshold, one_attempt: oneAttempt, show_answers: showAnswers, questions, token: "" });
      router.push("/admin/quizzes");
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  return (
    <div style={s.container}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={() => router.push("/admin/quizzes")}>← Назад</button>
        <h1 style={s.title}>Новый квиз</h1>
      </div>
      {error && <div style={s.error}>{error}</div>}
      <div style={s.card}>
        <label style={s.label}>Название *</label>
        <input style={s.input} value={title} onChange={(e) => setTitle(e.target.value)} />
        <div style={s.checkboxRow}>
          <label style={s.checkboxLabel}><input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} /> Опубликован</label>
          <label style={s.checkboxLabel}><input type="checkbox" checked={oneAttempt} onChange={(e) => setOneAttempt(e.target.checked)} /> Одна попытка</label>
          <label style={s.checkboxLabel}><input type="checkbox" checked={showAnswers} onChange={(e) => setShowAnswers(e.target.checked)} /> Показать ответы</label>
        </div>
        <label style={s.label}>Порог прохождения, %</label>
        <input style={s.input} type="number" min={0} max={100} value={passThreshold} onChange={(e) => setPassThreshold(Number(e.target.value))} />
      </div>
      <h2 style={s.sectionTitle}>Вопросы</h2>
      {questions.map((q, qi) => (
        <div key={qi} style={s.questionCard}>
          <div style={s.questionHeader}>
            <span style={s.questionNum}>Вопрос {qi + 1}</span>
            {questions.length > 1 && <button style={s.removeBtn} onClick={() => removeQuestion(qi)}>Удалить</button>}
          </div>
          <input style={s.input} value={q.text} onChange={(e) => updateQuestion(qi, e.target.value)} placeholder="Текст вопроса" />
          <div style={{ marginTop: "12px" }}>
            {q.answers.map((a, ai) => (
              <div key={ai} style={s.answerRow}>
                <input type="radio" name={`correct-${qi}`} checked={a.is_correct} onChange={() => setCorrect(qi, ai)} />
                <input style={{ ...s.input, flex: 1, margin: 0 }} value={a.text} onChange={(e) => updateAnswer(qi, ai, e.target.value)} placeholder={`Вариант ${ai + 1}`} />
                {q.answers.length > 2 && <button style={s.removeAnswerBtn} onClick={() => removeAnswer(qi, ai)}>✕</button>}
              </div>
            ))}
            <button style={s.addAnswerBtn} onClick={() => addAnswer(qi)}>+ Добавить вариант</button>
          </div>
        </div>
      ))}
      <button style={s.addQuestionBtn} onClick={addQuestion}>+ Добавить вопрос</button>
      <button style={s.saveBtn} onClick={handleSave} disabled={saving}>{saving ? "Сохранение..." : "Создать квиз"}</button>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  container: { maxWidth: "800px", margin: "0 auto", padding: "32px 16px" },
  header: { display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px" },
  backBtn: { background: "none", border: "1px solid #ddd", borderRadius: "8px", padding: "8px 16px", cursor: "pointer" },
  title: { margin: 0, fontSize: "24px", color: "#1a1a2e" },
  error: { background: "#fee2e2", color: "#dc2626", padding: "12px", borderRadius: "8px", marginBottom: "16px" },
  card: { background: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 2px 10px rgba(0,0,0,0.08)", marginBottom: "24px", display: "flex", flexDirection: "column", gap: "12px" },
  label: { fontSize: "14px", fontWeight: "bold", color: "#374151" },
  input: { padding: "10px 14px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "15px", width: "100%", boxSizing: "border-box" },
  checkboxRow: { display: "flex", gap: "24px", flexWrap: "wrap" },
  checkboxLabel: { display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", cursor: "pointer" },
  sectionTitle: { fontSize: "20px", margin: "0 0 16px", color: "#1a1a2e" },
  questionCard: { background: "white", borderRadius: "12px", padding: "20px", boxShadow: "0 2px 10px rgba(0,0,0,0.08)", marginBottom: "16px" },
  questionHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" },
  questionNum: { fontWeight: "bold", color: "#4f46e5" },
  removeBtn: { background: "#fef2f2", color: "#dc2626", border: "none", borderRadius: "6px", padding: "6px 12px", cursor: "pointer", fontSize: "13px" },
  answerRow: { display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" },
  removeAnswerBtn: { background: "#f3f4f6", border: "none", borderRadius: "6px", padding: "6px 10px", cursor: "pointer", color: "#6b7280" },
  addAnswerBtn: { background: "none", border: "1px dashed #4f46e5", color: "#4f46e5", borderRadius: "6px", padding: "6px 12px", cursor: "pointer", fontSize: "13px", marginTop: "4px" },
  addQuestionBtn: { display: "block", width: "100%", padding: "12px", background: "none", border: "2px dashed #4f46e5", color: "#4f46e5", borderRadius: "10px", cursor: "pointer", fontSize: "15px", marginBottom: "16px" },
  saveBtn: { display: "block", width: "100%", padding: "14px", background: "#4f46e5", color: "white", border: "none", borderRadius: "10px", cursor: "pointer", fontSize: "16px", fontWeight: "bold" },
};
