import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/editor/editor').then((m) => m.Editor),
  },
];
