import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Chat from "./pages/Chat";
import Announcements from "./pages/Announcements";
import MyAnnouncements from "./pages/MyAnnouncements";
import CenterDetail from "./pages/CenterDetail";
import Certificates from "./pages/Certificates";
import AdminDashboard from "./pages/AdminDashboard";
import { type ReactNode } from "react";

function Protected({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin";

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />
      {/* Admins land on the approval dashboard */}
      <Route path="/" element={<Protected>{isAdmin ? <AdminDashboard /> : <Dashboard />}</Protected>} />
      <Route path="/chat" element={<Protected><Chat /></Protected>} />
      <Route path="/announcements" element={<Protected><Announcements /></Protected>} />
      <Route path="/my-announcements" element={<Protected><MyAnnouncements /></Protected>} />
      <Route path="/certificates" element={<Protected><Certificates /></Protected>} />
      <Route path="/admin" element={<Protected><AdminDashboard /></Protected>} />
      <Route path="/centers/:userId" element={<Protected><CenterDetail /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
