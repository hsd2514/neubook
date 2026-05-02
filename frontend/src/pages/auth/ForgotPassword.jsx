import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "../../components/ui/Button.jsx";
import { Input } from "../../components/ui/Input.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { api } from "../../services/api.js";

export default function ForgotPassword() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [token, setToken] = useState(searchParams.get("token") || "");
  const [np, setNp] = useState("");
  const [step, setStep] = useState(searchParams.get("token") ? 2 : 1);
  const [msg, setMsg] = useState("");

  async function requestReset(e) {
    e.preventDefault();
    setMsg("");
    try {
      await api("/api/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) });
      setMsg("If the account exists, check your email for the reset link.");
      setStep(2);
    } catch (ex) { setMsg(ex.message); }
  }

  async function doReset(e) {
    e.preventDefault();
    setMsg("");
    try {
      await api("/api/auth/reset-password", { method: "POST", body: JSON.stringify({ token, new_password: np }) });
      setMsg("Password updated. You can sign in.");
      setStep(3);
    } catch (ex) { setMsg(ex.message); }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-4">
      <Card className="w-full max-w-md">
        <h1 className="text-xl font-bold text-on-surface">Reset password</h1>
        {step === 1 && (
          <form onSubmit={requestReset} className="mt-4 space-y-4">
            <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Button type="submit" className="w-full">Send reset link</Button>
          </form>
        )}
        {step === 2 && (
          <form onSubmit={doReset} className="mt-4 space-y-4">
            <Input label="Reset token" value={token} onChange={(e) => setToken(e.target.value)} required />
            <Input label="New password" type="password" value={np} onChange={(e) => setNp(e.target.value)} required minLength={8} />
            <Button type="submit" className="w-full">Update password</Button>
          </form>
        )}
        {msg && <p className="mt-3 text-sm text-on-surface-variant">{msg}</p>}
        <p className="mt-4 text-center text-sm"><Link to="/login" className="text-primary-container hover:underline">Back to sign in</Link></p>
      </Card>
    </div>
  );
}
