import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "../../components/ui/Button.jsx";
import { Input } from "../../components/ui/Input.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { api } from "../../services/api.js";
import { useAuth } from "../../context/AuthContext.jsx";

export default function VerifyOtp() {
  const [params] = useSearchParams();
  const email = params.get("email") || "";
  const nav = useNavigate();
  const { setUserFromTokens } = useAuth();
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    try {
      const data = await api("/api/auth/verify-otp", { method: "POST", body: JSON.stringify({ email, code }) });
      setUserFromTokens(data);
      nav("/");
    } catch (ex) { setErr(ex.message || "Invalid code"); }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-4">
      <Card className="w-full max-w-md">
        <h1 className="mb-1 text-xl font-bold text-on-surface">Verify email</h1>
        <p className="mb-4 text-sm text-on-surface-variant">Enter the code sent to {email || "your email"}.</p>
        <form onSubmit={onSubmit} className="space-y-4">
          <Input label="Verification code" value={code} onChange={(e) => setCode(e.target.value)} required />
          {err && <p className="text-sm text-error">{err}</p>}
          <Button type="submit" className="w-full">Verify & continue</Button>
        </form>
        <p className="mt-4 text-center text-sm"><Link to="/signup" className="text-primary-container hover:underline">Back</Link></p>
      </Card>
    </div>
  );
}
