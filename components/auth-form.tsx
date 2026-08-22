 "use client";
import Link from "next/link";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase";

export function AuthForm() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [name, setName] = useState(""); const [message, setMessage] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault(); const sb = supabaseBrowser();
    if (!sb) { setMessage("Connect Supabase in .env.local first."); return; }
    if (mode === "login") {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      setMessage(error?.message || "Signed in successfully.");
    } else {
      const { error } = await sb.auth.signUp({ email, password, options: { data: { name } } });
      setMessage(error?.message || "Account created. Check your email if confirmation is enabled.");
    }
  }
  return <main className="center-page"><div className="auth-card"><Link href="/" className="brand auth-brand"><img src="/flash-store-logo.png" alt="Flash Store" /><span>FLASH <b>STORE</b></span></Link><h1>{mode === "login" ? "Welcome back" : "Create account"}</h1><form onSubmit={submit}>{mode === "signup" && <label>Name<input required value={name} onChange={e => setName(e.target.value)} /></label>}<label>Email<input type="email" required value={email} onChange={e => setEmail(e.target.value)} /></label><label>Password<input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} /></label><button className="btn">{mode === "login" ? "Sign In" : "Sign Up"}</button></form><p className="message">{message}</p><button className="link-btn" onClick={() => setMode(mode === "login" ? "signup" : "login")}>{mode === "login" ? "Create a new account" : "Already have an account? Sign in"}</button></div></main>;
}