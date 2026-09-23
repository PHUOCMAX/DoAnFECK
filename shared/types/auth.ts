export type UserRole = "user" | "admin";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest extends LoginRequest {
  name: string;
}

export interface LoginResponse {
  success: true;
  message: string;
  token: string;
  user: AuthUser;
}

export interface RegisterResponse {
  success: true;
  message: string;
  user: AuthUser;
}
