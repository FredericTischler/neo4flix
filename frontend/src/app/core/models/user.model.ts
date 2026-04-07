export interface UserProfile {
  userId: string;
  username: string;
  email: string;
  twoFactorEnabled: boolean;
  roles: string[];
}