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
  {
    path: '',
    loadComponent: () => import('./layout/layout.component'),
    canActivate: [authGuard],
    children: [
      { path: 'home', loadComponent: () => import('./features/home/home.component') },
      { path: 'search', loadComponent: () => import('./features/search/search.component') },
      { path: 'movies/:movieId', loadComponent: () => import('./features/movie-detail/movie-detail.component') },
      { path: 'watchlist', loadComponent: () => import('./features/watchlist/watchlist.component') },
      { path: 'recommendations', loadComponent: () => import('./features/recommendations/recommendations.component') },
      { path: 'profile', loadComponent: () => import('./features/profile/profile.component') },
      { path: 'shared/:userId', loadComponent: () => import('./features/shared-recommendations/shared-recommendations.component') },
      { path: '', redirectTo: 'home', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: 'login' },
];