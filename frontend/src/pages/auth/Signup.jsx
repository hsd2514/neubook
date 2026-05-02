import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button.jsx";
import { Input } from "../../components/ui/Input.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { api } from "../../services/api.js";

export default function Signup() {
  const nav = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    try {
      await api("/api/auth/signup", { method: "POST", body: JSON.stringify({ full_name: fullName, email, password }) });
      nav(`/verify-otp?email=${encodeURIComponent(email)}`);
    } catch (ex) { setErr(ex.message || "Signup failed"); }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-4">
      <Card className="w-full max-w-md animate-enter shadow-elevated stagger-1">
        <h1 className="mb-1 text-2xl font-bold text-on-surface">Create account</h1>
        <p className="mb-6 text-sm text-on-surface-variant">We will send a verification code to your email.</p>
        <form onSubmit={onSubmit} className="space-y-4">
          <Input label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
          {err && <p className="text-sm text-error">{err}</p>}
          <Button type="submit" className="w-full">Continue</Button>
        </form>
        <p className="mt-4 text-center text-sm text-on-surface-variant">
          Already have an account? <Link to="/login" className="font-medium text-primary-container hover:underline">Sign in</Link>
        </p>
      </Card>
    </div>
  );
}
