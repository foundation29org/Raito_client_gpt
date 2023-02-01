import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { AuthGuard } from 'app/shared/auth/auth-guard.service';
import { RoleGuard } from 'app/shared/auth/role-guard.service';

import { DashboardAdminComponent } from './dashboard-admin/dashboard-admin.component';
import { TranslationsComponent } from './translations/translations.component';

const routes: Routes = [
  {
    path: '',
    children: [
      {
        path: 'dashboard-admin',
        component: DashboardAdminComponent,
        data: {
          title: 'menu.Dashboard Admin',
          expectedRole: ['Admin']
        },
        canActivate: [AuthGuard, RoleGuard]
      },
      {
        path: 'translations',
        component: TranslationsComponent,
        data: {
          title: 'menu.Translations',
          expectedRole: ['Admin']
        },
        canActivate: [AuthGuard, RoleGuard]
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminRoutingModule { }
