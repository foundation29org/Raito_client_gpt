import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { AuthGuard } from 'app/shared/auth/auth-guard.service';
import { RoleGuard } from 'app/shared/auth/role-guard.service';

import { LangsComponent } from "./langs/langs.component";
import { TranslationsComponent } from "./translations/translations.component";
import { DashboardSuperAdminComponent } from "./dashboard-superadmin/dashboard-superadmin.component";
const routes: Routes = [
  {
    path: '',
    children: [
      {
        path: 'dashboard-superadmin',
        component: DashboardSuperAdminComponent,
        data: {
          title: 'menu.Dashboard Super Admin',
          expectedRole: ['SuperAdmin']
        },
        canActivate: [AuthGuard, RoleGuard]
      },
      {
        path: 'langs',
        component: LangsComponent,
        data: {
          title: 'menu.Languages',
          expectedRole: ['SuperAdmin']
        },
        canActivate: [AuthGuard, RoleGuard]
      },
      {
        path: 'translations',
        component: TranslationsComponent,
        data: {
          title: 'menu.Translations',
          expectedRole: ['SuperAdmin']
        },
        canActivate: [AuthGuard, RoleGuard]
      },
      {
        path: 'manageclinicinfo',
        loadChildren: () => import('./manage-clinicinfo/manage-clinical-info.module').then(m => m.ManageClinicalInfoModule)
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SuperAdminRoutingModule { }
