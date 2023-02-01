import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { AuthGuard } from 'app/shared/auth/auth-guard.service';
import { RoleGuard } from 'app/shared/auth/role-guard.service';

import { MedicationComponent } from './medication/medication.component';

const routes: Routes = [
  {
    path: '',
    children: [
      {
        path: 'medication',
        component: MedicationComponent,
        data: {
          title: 'clinicalinfo.Medication',
          expectedRole: ['SuperAdmin']
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
export class ManageClinicalInfoRoutingModule { }
