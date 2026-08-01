import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authSlice';
import PATHS from './routeConfig';

// Route Guards
import ProtectedRoute from './ProtectedRoute';
import RoleRoute from './RoleRoute';

// Layouts
import AppShell from '../components/layout/AppShell';

// Pages
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import VerifyEmail from '../pages/auth/VerifyEmail';
import ForgotPassword from '../pages/auth/ForgotPassword';
import ResetPassword from '../pages/auth/ResetPassword';
import Dashboard from '../pages/shared/Dashboard';
import Appointments from '../pages/shared/Appointments';
import BookAppointment from '../pages/patient/BookAppointment';
import VideoCall from '../pages/shared/VideoCall';
import DoctorsDirectory from '../pages/patient/DoctorsDirectory';
import MedicalRecords from '../pages/shared/MedicalRecords';
import Profile from '../pages/shared/Profile';
import NotFound from '../pages/shared/NotFound';

export const AppRoutes: React.FC = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <Routes>
      {/* Root Path Redirect */}
      <Route
        path="/"
        element={
          isAuthenticated ? (
            <Navigate to={PATHS.DASHBOARD} replace />
          ) : (
            <Navigate to={PATHS.LOGIN} replace />
          )
        }
      />

      {/* Public Auth Routes */}
      <Route
        path={PATHS.LOGIN}
        element={
          isAuthenticated ? <Navigate to={PATHS.DASHBOARD} replace /> : <Login />
        }
      />
      <Route
        path={PATHS.REGISTER}
        element={
          isAuthenticated ? <Navigate to={PATHS.DASHBOARD} replace /> : <Register />
        }
      />
      <Route path={PATHS.VERIFY_EMAIL} element={<VerifyEmail />} />
      <Route path={PATHS.FORGOT_PASSWORD} element={<ForgotPassword />} />
      <Route path={PATHS.RESET_PASSWORD} element={<ResetPassword />} />

      {/* Protected App Routes */}
      <Route element={<ProtectedRoute />}>
        {/* Full-screen video call without AppShell header */}
        <Route path={PATHS.VIDEO_CALL} element={<VideoCall />} />

        <Route element={<AppShell />}>
          <Route path={PATHS.DASHBOARD} element={<Dashboard />} />
          <Route path={PATHS.APPOINTMENTS} element={<Appointments />} />
          <Route path={PATHS.MEDICAL_RECORDS} element={<MedicalRecords />} />
          <Route path={PATHS.DOCTORS} element={<DoctorsDirectory />} />
          <Route path={PATHS.PROFILE} element={<Profile />} />
          
          {/* Patient Only Routes */}
          <Route element={<RoleRoute allowedRoles={['patient']} />}>
            <Route path={PATHS.BOOK_APPOINTMENT} element={<BookAppointment />} />
          </Route>
        </Route>
      </Route>

      {/* Fallback 404 Route */}
      <Route path={PATHS.NOT_FOUND} element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;
