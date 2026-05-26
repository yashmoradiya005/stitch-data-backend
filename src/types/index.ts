export interface User {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  created_at: Date;
  updated_at: Date;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest extends LoginRequest {
  name: string;
  confirmPassword: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: Omit<User, "password_hash">;
}

export interface JWTPayload {
  userId: string;
  email: string;
}

export interface Company {
  id: string;
  user_id: string;
  name: string;
  machine_count: number;
  created_at: Date;
}

export interface CreateCompanyRequest {
  name: string;
  machineCount: number;
}
