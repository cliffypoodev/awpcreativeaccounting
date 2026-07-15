import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const trimmed = email.trim();
    if (!trimmed) return;
    setLoading(true);
    const result = await authClient.emailOtp.sendVerificationOtp({
      email: trimmed,
      type: "sign-in",
    });
    setLoading(false);
    if (result.error) {
      setError(result.error.message || "Failed to send verification code");
    } else {
      navigate("/verify-otp", { state: { email: trimmed } });
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left brand panel */}
      <div className="relative hidden flex-col justify-between bg-sidebar p-12 text-sidebar-foreground lg:flex">
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-semibold">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-sidebar-primary font-display text-lg font-bold text-sidebar-primary-foreground">
            A
          </span>
          AWP Creative
        </Link>
        <div>
          <h2 className="font-display text-4xl font-semibold leading-tight">
            Billing,
            <br />
            beautifully in order.
          </h2>
          <p className="mt-4 max-w-sm text-sidebar-foreground/70">
            Invoices, estimates and expenses for AWP Creative — in one warm, fast workspace. Sign in
            with a one-time code; no passwords to forget.
          </p>
        </div>
        <p className="font-mono text-xs uppercase tracking-widest text-sidebar-foreground/50">
          AWP Creative · Internal workspace
        </p>
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-sm">
          <Link to="/" className="mb-8 flex items-center gap-2 font-display text-xl font-semibold lg:hidden">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-foreground text-lg font-bold text-background">
              A
            </span>
            AWP Creative
          </Link>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter your work email and we'll send you a one-time code.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@studio.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11"
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" disabled={loading} className="h-11 w-full gap-1">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading ? "Sending code…" : "Continue"}
              {!loading ? <ArrowRight className="h-4 w-4" /> : null}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Access is limited to AWP Creative team members.
          </p>
        </div>
      </div>
    </div>
  );
}
