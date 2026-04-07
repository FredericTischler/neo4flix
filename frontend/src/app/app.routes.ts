import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component'),
    canActivate: [guestGuard],
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register.component'),
    canActivate: [guestGuard],
  },
  {
    path: 'verify-2fa',
    loadComponent: () => import('./features/auth/verify-2fa/verify-2fa.component'),
    canActivate: [guestGuard],
  },
  // Protected routes — added in later phases:
  // { path: 'home', loadComponent: () => ..., canActivate: [authGuard] },
  // { path: 'movies/:id', loadComponent: () => ..., canActivate: [authGuard] },
  // { path: 'recommendations', loadComponent: () => ..., canActivate: [authGuard] },
  // { path: 'watchlist', loadComponent: () => ..., canActivate: [authGuard] },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' },
];