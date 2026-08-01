import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authSlice';
import type { Role } from '../types/auth.types';

interface RoleRouteProps {
  allowedRoles: Role[];
}

/**
 * Route guard that requires the user to have one of the specified roles.
 * Assumes ProtectedRoute runs first to ensure user is logged in.
 * If user does not have an allowed role, redirects them to /dashboard or /unauthorized.
 */
export const RoleRoute: React.FC<RoleRouteProps> = ({ allowedRoles }) => {
  const user = useAuthStore((state) => state.user);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    // Redirect unauthorized roles back to the main dashboard or 403 page
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default RoleRoute;
