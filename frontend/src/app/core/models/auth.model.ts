export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
}

export interface TwoFactorRequired {
  requiresTwoFactor: true;
  tempToken: string;
}

export type LoginResponse = AuthResponse | TwoFactorRequired;

export interface Verify2faRequest {
  tempToken: string;
  code: string;
}

export function isTwoFactorRequired(res: LoginResponse): res is TwoFactorRequired {
  return 'requiresTwoFactor' in res && res.requiresTwoFactor === true;
}