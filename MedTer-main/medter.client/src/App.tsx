import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./auth";
import AmbientBackground from "./components/AmbientBackground";
import Layout from "./components/Layout";
import Register from "./pages/Register";
import About from "./pages/About";
import Chat from "./pages/Chat";
import Announcements from "./pages/Announcements";
import Dashboard from "./pages/Dashboard";
import CenterDetail from "./pages/CenterDetail";
import AdminDashboard from "./pages/AdminDashboard";
import Profile from "./pages/Profile";
import { type ReactNode } from "react";

function Protected({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

/** Old feed URLs keep their query (search, mine, welcome) and land on `/`. */
function ToFeed() {
  const { search, hash } = useLocation();
  return <Navigate to={{ pathname: "/", search, hash }} replace />;
}

export default function App() {
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin";

  return (
    <>
      <AmbientBackground />
      <Routes>
        <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />

        {/* Header stays mounted; only the page outlet changes. */}
        <Route element={<Layout />}>
          <Route
            path="/"
            element={isAdmin ? <AdminDashboard /> : <Announcements />}
          />
          <Route path="/about" element={<About />} />
          <Route path="/centers" element={<Dashboard />} />
          <Route path="/centers/:userId" element={<CenterDetail />} />
          <Route path="/chat" element={<Protected><Chat /></Protected>} />
          <Route path="/announcements" element={isAdmin ? <Announcements /> : <ToFeed />} />
          <Route path="/dashboard" element={<ToFeed />} />
          <Route path="/my-announcements" element={<ToFeed />} />
          <Route path="/certificates" element={<Protected><Navigate to="/profile#certificates" replace /></Protected>} />
          <Route path="/profile" element={<Protected><Profile /></Protected>} />
          <Route path="/subscriptions" element={<ToFeed />} />
          <Route path="/pricing" element={<ToFeed />} />
          <Route path="/admin" element={<Protected><AdminDashboard /></Protected>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </>
  );
}
