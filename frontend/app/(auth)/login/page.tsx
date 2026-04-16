"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getClient, saveAuth } from "../../lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError("");
    setLoading(true);
    try {
      const client = getClient();
      if (isRegister) {
        const res = await client.auth.Register({ email, password, role });
        saveAuth(res.token, role);
        router.push(role === "admin" ? "/admin/quizzes" : "/quizzes");
      } else {
        const res = await client.auth.Login({ email, password });
        const payload = JSON.parse(atob(res.token.split(".")[1]));
        saveAuth(res.token, payload.role);
        router.push(payload.role === "admin" ? "/admin/quizzes" : "/quizzes");
      }
    } catch (e: any) {
      setError(e.message || "Ошибка входа");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>{isRegister ? "Регистрация" : "Вход"}</h1>
        {error && <div style={styles.error}>{error}</div>}
        <input style={styles.input} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input style={styles.input} type="password" placeholder="Пароль" value={password} onChange={(e) => setPassword(e.target.value)} />
        {isRegister && (
          <select style={styles.input} value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="user">Пользователь</option>
            <option value="admin">Администратор</option>
          </select>
        )}
        <button style={styles.button} onClick={handleSubmit} disabled={loading}>
          {loading ? "Загрузка..." : isRegister ? "Зарегистрироваться" : "Войти"}
        </button>
        <button style={styles.link} onClick={() => setIsRegister(!isRegister)}>
          {isRegister ? "Уже есть аккаунт? Войти" : "Нет аккаунта? Зарегистрироваться"}
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f0f2f5" },
  card: { background: "white", padding: "40px", borderRadius: "12px", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", width: "100%", maxWidth: "400px", display: "flex", flexDirection: "column", gap: "16px" },
  title: { textAlign: "center", margin: 0, fontSize: "24px", color: "#1a1a2e" },
  input: { padding: "12px 16px", borderRadius: "8px", border: "1px solid #ddd", fontSize: "16px", outline: "none" },
  button: { padding: "12px", background: "#4f46e5", color: "white", border: "none", borderRadius: "8px", fontSize: "16px", cursor: "pointer", fontWeight: "bold" },
  link: { background: "none", border: "none", color: "#4f46e5", cursor: "pointer", fontSize: "14px", textAlign: "center" },
  error: { background: "#fee2e2", color: "#dc2626", padding: "10px", borderRadius: "8px", fontSize: "14px" },
};
