export type Role = 'admin' | 'doctor' | 'patient';

export interface User {
  _id?: string;
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  phone?: string;
  avatarUrl?: string;
  isActive: boolean;
  isEmailVerified: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
  // Role-specific fields
  specialization?: string;
  qualifications?: string[];
  experienceYears?: number;
  consultationFee?: number;
  departmentId?: string;
  dateOfBirth?: string;
  gender?: string;
  bloodGroup?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: User, accessToken: string) => void;
  setAccessToken: (accessToken: string) => void;
  updateUser: (user: User) => void;
  clearAuth: () => void;
  setLoading: (isLoading: boolean) => void;
}
