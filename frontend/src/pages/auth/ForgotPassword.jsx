import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "../../components/ui/Button.jsx";
import { Input } from "../../components/ui/Input.jsx";
import { Card } from "../../components/ui/Card.jsx";
import { api } from "../../services/api.js";
import { useToast } from "../../context/ToastContext.jsx";

export default function ForgotPassword() {
  const [searchParams] = useSearchParams();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [token, setToken] = useState(searchParams.get("token") || "");
  const [np, setNp] = useState("");
  const [step, setStep] = useState(searchParams.get("token") ? 2 : 1);

  async function requestReset(e) {
    e.preventDefault();
    try {
      await api("/api/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) });
      toast.success("If the account exists, check your email for the reset link.");
      setStep(2);
    } catch (ex) { toast.error(ex.message || "Failed to send reset link."); }
  }

  async function doReset(e) {
    e.preventDefault();
    try {
      await api("/api/auth/reset-password", { method: "POST", body: JSON.stringify({ token, new_password: np }) });
      toast.success("Password updated. You can now sign in.");
      setStep(3);
    } catch (ex) { toast.error(ex.message || "Failed to reset password."); }
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
        {step === 3 && <p className="mt-4 text-sm text-secondary font-medium">Password updated! You can now sign in.</p>}
        <p className="mt-4 text-center text-sm"><Link to="/login" className="text-primary-container hover:underline">Back to sign in</Link></p>
      </Card>
    </div>
  );
}
