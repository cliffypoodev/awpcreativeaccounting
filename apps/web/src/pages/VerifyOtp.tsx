import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { authClient } from "@/lib/auth-client";

export default function VerifyOtp() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = (location.state as { email?: string } | null)?.email;

  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (!email) navigate("/login", { replace: true });
  }, [email, navigate]);

  const verify = async (code: string) => {
    if (!email) return;
    setError("");
    setLoading(true);
    const result = await authClient.signIn.emailOtp({ email: email.trim(), otp: code });
    setLoading(false);
    if (result.error) {
      setError(result.error.message || "Invalid or expired code");
      setOtp("");
    } else {
      navigate("/app");
    }
  };

  const handleChange = (value: string) => {
    setOtp(value);
    if (value.length === 6) verify(value);
  };

  const resend = async () => {
    if (!email) return;
    setError("");
    await authClient.emailOtp.sendVerificationOtp({ email: email.trim(), type: "sign-in" });
    setResent(true);
    setTimeout(() => setResent(false), 3000);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-sm">
        <Link
          to="/login"
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Check your email</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          We sent a 6-digit code to <span className="font-medium text-foreground">{email}</span>.
        </p>

        <div className="mt-8 flex flex-col items-center">
          <InputOTP maxLength={6} value={otp} onChange={handleChange} disabled={loading}>
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>

          {loading ? (
            <p className="mt-5 inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Verifying…
            </p>
          ) : null}
          {error ? <p className="mt-5 text-sm text-destructive">{error}</p> : null}
        </div>

        <div className="mt-8 text-center text-sm text-muted-foreground">
          Didn't get it?{" "}
          <button onClick={resend} className="font-medium text-primary hover:underline">
            {resent ? "Code sent ✓" : "Resend code"}
          </button>
        </div>
      </div>
    </div>
  );
}
