import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import { AppShell } from "./components/layout/AppShell.jsx";
import { CustomerNav } from "./components/layout/CustomerNav.jsx";
import Login from "./pages/auth/Login.jsx";
import Signup from "./pages/auth/Signup.jsx";
import VerifyOtp from "./pages/auth/VerifyOtp.jsx";
import ForgotPassword from "./pages/auth/ForgotPassword.jsx";
import Home from "./pages/customer/Home.jsx";
import BookingFlow from "./pages/customer/BookingFlow.jsx";
import EmbedBookingPage from "./pages/customer/EmbedBookingPage.jsx";
import Profile from "./pages/customer/Profile.jsx";
import Dashboard from "./pages/organiser/Dashboard.jsx";
import AppointmentList from "./pages/organiser/AppointmentList.jsx";
import AppointmentForm from "./pages/organiser/AppointmentForm.jsx";
import BookingsList from "./pages/organiser/BookingsList.jsx";
import CalendarView from "./pages/organiser/CalendarView.jsx";
import OrganiserReports from "./pages/organiser/OrganiserReports.jsx";
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import AdminUsers from "./pages/admin/AdminUsers.jsx";

function Protected({ roles, children }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary-container border-t-transparent" />
          <p className="mt-3 text-sm text-on-surface-variant">Loading…</p>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function OrganiserShell() {
  return (
    <Protected roles={["organiser", "admin"]}>
      <AppShell />
    </Protected>
  );
}

function AdminShell() {
  return (
    <Protected roles={["admin"]}>
      <AppShell />
    </Protected>
  );
}

function CustomerLayout() {
  return (
    <div className="min-h-screen bg-surface">
      <CustomerNav />
      <main className="p-4 lg:p-6">
        <Outlet />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/verify-otp" element={<VerifyOtp />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      <Route element={<CustomerLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/book/share/:token" element={<BookingFlow />} />
        <Route path="/book/:id" element={<BookingFlow />} />
        <Route
          path="/profile"
          element={
            <Protected roles={["customer", "admin", "organiser"]}>
              <Profile />
            </Protected>
          }
        />
      </Route>

      <Route path="/embed/book/share/:token" element={<EmbedBookingPage />} />

      <Route path="/app" element={<OrganiserShell />}>
        <Route index element={<Dashboard />} />
        <Route path="appointments" element={<AppointmentList />} />
        <Route path="appointments/new" element={<AppointmentForm />} />
        <Route path="appointments/:id" element={<AppointmentForm />} />
        <Route path="bookings" element={<BookingsList />} />
        <Route path="calendar" element={<CalendarView />} />
        <Route path="reports" element={<OrganiserReports />} />
      </Route>

      <Route path="/admin" element={<AdminShell />}>
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsers />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
