import { Navigate, useSearchParams } from "react-router-dom";

/** Legacy /pricing → profile subscription section (keeps Stripe return query). */
export default function Pricing() {
  const [params] = useSearchParams();
  const q = params.toString();
  return <Navigate to={`/subscriptions${q ? `?${q}` : ""}`} replace />;
}
