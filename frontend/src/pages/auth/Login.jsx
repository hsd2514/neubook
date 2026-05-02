import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button.jsx";
import { Input } from "../../components/ui/Input.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

function redirectFor(role) {
  if (role === "admin") return "/admin";
  if (role === "organiser") return "/app";
  return "/";
}

export default function Login() {
  const nav = useNavigate();
  const { user, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) nav(redirectFor(user.role), { replace: true });
  }, [user, nav]);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const u = await login(email, password);
      nav(redirectFor(u.role));
    } catch (ex) {
      setErr(ex.message || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-4">
      <Card className="w-full max-w-md animate-enter shadow-elevated">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary-container to-primary text-lg font-bold text-white shadow-card">V</div>
          <h1 className="text-2xl font-bold text-on-surface">Welcome back</h1>
          <p className="mt-1 text-sm text-on-surface-variant">Sign in to Neubook</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
          {err && <p className="rounded-lg bg-error-container/30 px-3 py-2 text-sm text-error">{err}</p>}
          <Button type="submit" className="w-full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>
        </form>
        <p className="mt-4 text-center text-sm text-on-surface-variant">
          <Link to="/forgot-password" className="font-medium text-secondary hover:underline">Forgot password?</Link>
          {" · "}
          <Link to="/signup" className="font-medium text-primary-container hover:underline">Create account</Link>
        </p>
        <div className="mt-5 rounded-lg border border-dashed border-outline-variant bg-surface-container-low p-3">
          <p className="mb-1 text-xs font-bold uppercase text-on-surface-variant">Test accounts</p>
          <div className="grid gap-1 text-xs text-on-surface-variant">
            <p><span className="font-medium text-on-surface">Customer:</span> customer@test.com</p>
            <p><span className="font-medium text-on-surface">Organiser:</span> organiser@test.com</p>
            <p><span className="font-medium text-on-surface">Admin:</span> admin@test.com</p>
            <p className="mt-1 text-[10px]">All passwords: <code className="rounded bg-surface-container-high px-1">test1234</code></p>
          </div>
        </div>
      </Card>
    </div>
  );
}
