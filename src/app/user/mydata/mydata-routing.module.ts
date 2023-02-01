import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AuthGuard } from 'app/shared/auth/auth-guard.service';
import { RoleGuard } from 'app/shared/auth/role-guard.service';

import { MenuComponent } from './menu/menu.component';

const routes: Routes = [
  {
    path: 'mydata',
    component: MenuComponent,
    data: {
      title: 'menu.Dashboard',
      expectedRole: ['User']
    },
    canActivate: [AuthGuard, RoleGuard]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MyDataRoutingModule { }
