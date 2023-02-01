import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AuthGuard } from 'app/shared/auth/auth-guard.service';
import { RoleGuard } from 'app/shared/auth/role-guard.service';

import { HomeComponent } from './home/home.component';
import { PersonalInfoComponent } from './personal-info/personal-info.component';
import { FeelComponent } from './feel/feel.component';
import { PromComponent } from './prom/prom.component';

const routes: Routes = [
  {
    path: 'home',
    component: HomeComponent,
    data: {
      title: 'menu.Dashboard',
      expectedRole: ['User']
    },
    canActivate: [AuthGuard, RoleGuard]
  },
  {
    path: 'patient-info',
    component: PersonalInfoComponent,
    data: {
      title: 'menu.Personal Info',
      expectedRole: ['User']
    },
    canActivate: [AuthGuard, RoleGuard]
  },
  {
    path: 'feel',
    component: FeelComponent,
    data: {
      title: 'menu.Feel',
      expectedRole: ['User']
    },
    canActivate: [AuthGuard, RoleGuard]
  },
  {
    path: 'prom',
    component: PromComponent,
    data: {
      title: 'Prom',
      expectedRole: ['User']
    },
    canActivate: [AuthGuard, RoleGuard]
  },
  {
    path: '',
    loadChildren: () => import('./clinicinfo/clinicinfo.module').then(m => m.ClinicalModule)
  },
  {
    path: '',
    loadChildren: () => import('./mydata/mydata.module').then(m => m.MydataModule)
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class UserRoutingModule { }
