"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn, getRole } from "./lib/api";

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    if (!isLoggedIn()) { router.push("/login"); return; }
    router.push(getRole() === "admin" ? "/admin/quizzes" : "/quizzes");
  }, []);
  return <div style={{ textAlign: "center", padding: "40px" }}>Загрузка...</div>;
}
