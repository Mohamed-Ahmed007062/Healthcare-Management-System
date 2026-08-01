export const PATHS = {
  // Public
  LOGIN: '/login',
  REGISTER: '/register',
  VERIFY_EMAIL: '/verify-email',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  
  // Protected
  DASHBOARD: '/dashboard',
  APPOINTMENTS: '/appointments',
  BOOK_APPOINTMENT: '/book-appointment',
  VIDEO_CALL: '/appointments/:id/video',
  MEDICAL_RECORDS: '/medical-records',
  DOCTORS: '/doctors',
  PROFILE: '/profile',
  
  // Wildcard
  NOT_FOUND: '*',
} as const;

export default PATHS;
