import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth";
import AmbientBackground from "./components/AmbientBackground";
import Layout from "./components/Layout";
import Register from "./pages/Register";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Chat from "./pages/Chat";
import Announcements from "./pages/Announcements";
import MyAnnouncements from "./pages/MyAnnouncements";
import CenterDetail from "./pages/CenterDetail";
import AdminDashboard from "./pages/AdminDashboard";
import Profile from "./pages/Profile";
import Pricing from "./pages/Pricing";
import { type ReactNode } from "react";

function Shell({ children }: { children: ReactNode }) {
  return <Layout>{children}</Layout>;
}

function Protected({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function RoleDashboard() {
  const { user } = useAuth();
  if (user?.role === "TrainingCenter") return <MyAnnouncements />;
  if (user?.role === "Admin") return <Navigate to="/" replace />;
  return <Navigate to="/profile" replace />;
}

export default function App() {
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin";

  return (
    <>
      <AmbientBackground />
      <Routes>
        <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />

        {/* Public: home + training centers list */}
        <Route path="/" element={<Shell>{isAdmin ? <AdminDashboard /> : <Home />}</Shell>} />
        <Route path="/centers" element={<Shell><Dashboard /></Shell>} />

        {/* Auth required */}
        <Route path="/centers/:userId" element={<Shell><Protected><CenterDetail /></Protected></Shell>} />
        <Route path="/chat" element={<Shell><Protected><Chat /></Protected></Shell>} />
        <Route path="/announcements" element={<Shell><Announcements /></Shell>} />
        <Route path="/dashboard" element={<Shell><Protected><RoleDashboard /></Protected></Shell>} />
        <Route path="/my-announcements" element={<Shell><Protected><Navigate to="/dashboard" replace /></Protected></Shell>} />
        <Route path="/certificates" element={<Shell><Protected><Navigate to="/profile" replace /></Protected></Shell>} />
        <Route path="/profile" element={<Shell><Protected><Profile /></Protected></Shell>} />
        <Route path="/pricing" element={<Shell><Pricing /></Shell>} />
        <Route path="/admin" element={<Shell><Protected><AdminDashboard /></Protected></Shell>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
