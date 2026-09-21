import { Routes } from '@angular/router';
import {
  authGuard,
  guestGuard,
  homeRedirectGuard,
  householdGuard,
  noHouseholdGuard,
  roleGuard,
} from './core/guards';
import { AppShell } from './layout/app-shell';
import { AuthLayout } from './layout/auth-layout';

export const routes: Routes = [
  {
    path: 'auth',
    component: AuthLayout,
    canActivate: [guestGuard],
    children: [
      { path: 'login', loadComponent: () => import('./features/auth/login').then((m) => m.Login) },
      {
        path: 'register',
        loadComponent: () => import('./features/auth/register').then((m) => m.Register),
      },
      { path: '', pathMatch: 'full', redirectTo: 'login' },
    ],
  },
  {
    path: 'onboarding',
    component: AuthLayout,
    canActivate: [authGuard, noHouseholdGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./features/onboarding/onboarding').then((m) => m.Onboarding),
      },
    ],
  },
  {
    path: '',
    component: AppShell,
    canActivate: [authGuard, householdGuard],
    children: [
      {
        path: 'home',
        canActivate: [roleGuard('resident')],
        loadComponent: () => import('./features/resident/resident-home').then((m) => m.ResidentHome),
      },
      {
        path: 'kitchen',
        canActivate: [roleGuard('cook')],
        loadComponent: () => import('./features/cook/cook-home').then((m) => m.CookHome),
      },
    ],
  },
  { path: '', pathMatch: 'full', canActivate: [homeRedirectGuard], children: [] },
  { path: '**', redirectTo: '' },
];
