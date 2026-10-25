import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth";
import AmbientBackground from "./components/AmbientBackground";
import Layout from "./components/Layout";
import Register from "./pages/Register";
import About from "./pages/About";
import Chat from "./pages/Chat";
import Announcements from "./pages/Announcements";
import CenterDetail from "./pages/CenterDetail";
import AdminDashboard from "./pages/AdminDashboard";
import Profile from "./pages/Profile";
import Pricing from "./pages/Pricing";
import Subscriptions from "./pages/Subscriptions";
import { type ReactNode } from "react";

function Protected({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin";

  return (
    <>
      <AmbientBackground />
      <Routes>
        <Route path="/register" element={user ? <Navigate to={isAdmin ? "/" : "/announcements"} replace /> : <Register />} />

        {/* Header stays mounted; only the page outlet changes. */}
        <Route element={<Layout />}>
          <Route
            path="/"
            element={isAdmin ? <AdminDashboard /> : <Navigate to="/announcements" replace />}
          />
          <Route path="/about" element={<About />} />
          <Route path="/centers" element={<Navigate to="/announcements" replace />} />
          <Route path="/centers/:userId" element={<CenterDetail />} />
          <Route path="/chat" element={<Protected><Chat /></Protected>} />
          <Route path="/announcements" element={<Announcements />} />
          <Route path="/dashboard" element={<Navigate to="/announcements" replace />} />
          <Route path="/my-announcements" element={<Navigate to="/announcements" replace />} />
          <Route path="/certificates" element={<Protected><Navigate to="/profile#certificates" replace /></Protected>} />
          <Route path="/profile" element={<Protected><Profile /></Protected>} />
          <Route path="/subscriptions" element={<Subscriptions />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/admin" element={<Protected><AdminDashboard /></Protected>} />
          <Route path="*" element={<Navigate to={user && !isAdmin ? "/announcements" : "/"} replace />} />
        </Route>
      </Routes>
    </>
  );
}
