import { NgModule } from '@angular/core';
import { CommonModule } from "@angular/common";
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { ManageClinicalInfoRoutingModule } from "./manage-clinical-info-routing.module";
import { TranslateModule } from '@ngx-translate/core';

import { MedicationComponent } from './medication/medication.component';

import { CustomFormsModule } from 'ngx-custom-validators';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';


import {MatInputModule} from '@angular/material/input';
import {MatSelectModule} from '@angular/material/select';
import {MatDatepickerModule} from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

@NgModule({
    exports: [
        TranslateModule
    ],
    imports: [
        CommonModule,
        ManageClinicalInfoRoutingModule,
        FormsModule,
        TranslateModule,
        CustomFormsModule,
        NgbModule,
        MatSelectModule,
        MatInputModule,
        MatDatepickerModule,
        MatNativeDateModule,
        ReactiveFormsModule
    ],
    declarations: [
        MedicationComponent
    ]
})
export class ManageClinicalInfoModule { }
