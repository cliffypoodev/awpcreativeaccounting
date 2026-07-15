import { Navigate } from "react-router-dom";

/**
 * Internal entry point. AWP Creative's billing workspace is private —
 * there is no public marketing or sign-in site. Route straight to the app.
 */
export default function Index() {
  return <Navigate to="/app" replace />;
}
