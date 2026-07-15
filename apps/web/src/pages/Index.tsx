import { Navigate } from "react-router-dom";
import { useSession } from "@/lib/auth-client";

/**
 * Internal entry point. AWP Creative's billing workspace is private —
 * there is no public marketing site. Route straight to the app (or sign-in).
 */
export default function Index() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return <Navigate to={session?.user ? "/app" : "/login"} replace />;
}
