import { NgModule } from '@angular/core';
import { CommonModule } from "@angular/common";
import { FormsModule } from '@angular/forms';

import { SuperAdminRoutingModule } from "./superadmin-routing.module";
import { TranslateModule } from '@ngx-translate/core';

import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { MatchHeightModule } from "../shared/directives/match-height.directive";
import { DashboardSuperAdminComponent } from "./dashboard-superadmin/dashboard-superadmin.component";
import { TranslationsComponent } from "./translations/translations.component";
import { LangsComponent } from "./langs/langs.component";

import { UiSwitchModule } from 'ngx-ui-switch';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';


@NgModule({
    imports: [
        CommonModule,
        SuperAdminRoutingModule,
        NgbModule,
        MatchHeightModule,
        TranslateModule,
        FormsModule,
        UiSwitchModule,
        NgxDatatableModule
    ],
    exports: [TranslateModule],
    declarations: [
        DashboardSuperAdminComponent,
        TranslationsComponent,
        LangsComponent
    ],
    providers: [],
})
export class SuperAdminModule { }
