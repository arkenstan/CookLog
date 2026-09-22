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
  // Must come before the AppShell route: that one also matches '' and would otherwise
  // render the shell with an empty outlet, leaving a blank page after sign-in.
  { path: '', pathMatch: 'full', canActivate: [homeRedirectGuard], children: [] },
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
        path: 'events/new',
        canActivate: [roleGuard('resident')],
        loadComponent: () => import('./features/resident/event-create').then((m) => m.EventCreate),
      },
      {
        path: 'events/:id',
        canActivate: [roleGuard('resident')],
        loadComponent: () => import('./features/resident/event-detail').then((m) => m.EventDetail),
      },
      {
        // No role guard: the pantry is shared household state and the cook writes to it too.
        path: 'grocery',
        loadComponent: () => import('./features/resident/grocery').then((m) => m.Grocery),
      },
      {
        path: 'regulars',
        canActivate: [roleGuard('resident')],
        loadComponent: () => import('./features/resident/regulars').then((m) => m.Regulars),
      },
      {
        path: 'households/add',
        data: { embedded: true },
        loadComponent: () => import('./features/onboarding/onboarding').then((m) => m.Onboarding),
      },
      {
        path: 'kitchen',
        canActivate: [roleGuard('cook')],
        loadComponent: () => import('./features/cook/cook-home').then((m) => m.CookHome),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
