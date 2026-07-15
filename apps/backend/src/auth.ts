import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { emailOTP } from "better-auth/plugins";
import { prisma } from "./prisma";
import { env } from "./env";

const isProduction = env.NODE_ENV === "production";
const allowedEmails = new Set(
  env.ALLOWED_EMAILS.split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
);

async function sendOtp(email: string, otp: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!allowedEmails.has(normalizedEmail)) {
    throw new Error("This email address is not authorized for AWP Accounting.");
  }

  if (env.RESEND_API_KEY) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.AUTH_FROM_EMAIL ?? "AWP Creative <onboarding@resend.dev>",
        to: normalizedEmail,
        subject: "Your AWP Accounting sign-in code",
        text: `Your AWP Accounting sign-in code is ${otp}. It expires shortly.`,
      }),
    });
    if (!response.ok) throw new Error("Could not send the sign-in code.");
    return;
  }

  if (!isProduction) {
    console.info(`[auth] Development OTP for ${normalizedEmail}: ${otp}`);
    return;
  }

  throw new Error("Production OTP email delivery is not configured.");
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "sqlite" }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BACKEND_URL,
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24,       // extend by 30 days on each daily visit
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,              // cache session check for 5 min to reduce DB hits
    },
  },
  trustedOrigins: [
    "http://localhost:*",
    "http://127.0.0.1:*",
    ...(env.FRONTEND_URL ? [env.FRONTEND_URL] : []),
  ],
  plugins: [
    emailOTP({
      async sendVerificationOTP({ email, otp, type }) {
        if (type !== "sign-in") return;
        await sendOtp(email, String(otp));
      },
    }),
  ],
  advanced: {
    trustedProxyHeaders: true,
    defaultCookieAttributes: {
      sameSite: isProduction ? "none" : "lax",
      secure: isProduction,
      partitioned: isProduction,
    },
  },
});
