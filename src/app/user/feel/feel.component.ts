import { Component, OnInit, LOCALE_ID } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from "@angular/router";
import { environment } from 'environments/environment';
import { HttpClient } from "@angular/common/http";
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from 'app/shared/auth/auth.service';
import { ToastrService } from 'ngx-toastr';
import { DateService } from 'app/shared/services/date.service';
import { EventsService } from 'app/shared/services/events.service';
import { SortService } from 'app/shared/services/sort.service';
import { PatientService } from 'app/shared/services/patient.service';
import { Observable, of, OperatorFunction } from 'rxjs';
import 'rxjs/add/observable/of';
import 'rxjs/add/operator/toPromise';
import { catchError, debounceTime, distinctUntilChanged, map, tap, switchMap, merge } from 'rxjs/operators'

import { DateAdapter } from '@angular/material/core';
import { ApiDx29ServerService } from 'app/shared/services/api-dx29-server.service';
import Swal from 'sweetalert2';
import { Subscription } from 'rxjs/Subscription';

export function getCulture() {
  return sessionStorage.getItem('culture');
}

@Component({
  selector: 'app-feel',
  templateUrl: './feel.component.html',
  styleUrls: ['./feel.component.scss'],
  providers: [PatientService, { provide: LOCALE_ID, useFactory: getCulture }, ApiDx29ServerService]
})
export class FeelComponent implements OnInit {
  lang: string = 'en';
  userId: string = '';
  selectedPatient: any = {};
  loadedPatientId: boolean = false;
  loadedInfoPatient: boolean = false;
  sending: boolean = false;
  private subscription: Subscription = new Subscription();
  step: string = '0';

  loadedFeels: boolean = false;
  feels: any = [];
  feelForm: FormGroup;
  submitted = false;

  constructor(private http: HttpClient, public translate: TranslateService, private dateAdapter: DateAdapter<Date>, private authService: AuthService, public toastr: ToastrService, private dateService: DateService, private patientService: PatientService, private eventsService: EventsService, private sortService: SortService, private apiDx29ServerService: ApiDx29ServerService, private formBuilder: FormBuilder, private router: Router) {

    this.lang = sessionStorage.getItem('lang');        

    this.dateAdapter.setLocale(sessionStorage.getItem('lang'));
   }

  ngOnInit(): void {
    this.initEnvironment();

    this.feelForm = this.formBuilder.group({
      a1: ['', Validators.required],
      a2: ['', Validators.required],
      a3: ['', Validators.required],
      date: [new Date(), Validators.required],
      note: []
  });

  }

  initEnvironment(){
    this.userId = this.authService.getIdUser();
    if(this.authService.getCurrentPatient()==null){
      this.loadPatientId();
    }else{
      this.loadedPatientId = true;
      this.selectedPatient = this.authService.getCurrentPatient();
    }
  }

  loadPatientId(){
    this.loadedPatientId = false;
    this.subscription.add( this.patientService.getPatientId()
    .subscribe( (res : any) => {
      if(res==null){
        this.authService.logout();
      }else{
        this.loadedPatientId = true;
        this.authService.setCurrentPatient(res);
        this.selectedPatient = res;
      }
     }, (err) => {
       console.log(err);
     }));
  }

  getLiteral(literal) {
    return this.translate.instant(literal);
  }

  get f() { return this.feelForm.controls; }

  //  On submit click, reset field value
  saveData(){
    this.sending = true;
    this.submitted = true;
    if (this.feelForm.invalid) {
        return;
    }
    setTimeout(() => {
      this.subscription.add( this.http.post(environment.api+'/api/feel/'+this.authService.getCurrentPatient().sub, this.feelForm.value)
        .subscribe((res: any) => {
          this.step = '1';
          this.sending = false;
          this.submitted = false;
          this.feelForm.reset();
          this.router.navigate(['/home']);
        }, (err) => {
          console.log(err);
          Swal.fire(this.translate.instant("generics.Warning"), this.translate.instant("generics.error try again"), "warning");
          this.sending = false;
        }));
    }, 200);
  }

  openStats(){
    this.step = '2';
    this.getFeels();
  }

  getFeels(){
    this.feels = [];
    this.subscription.add( this.http.get(environment.api+'/api/feels/'+this.authService.getCurrentPatient().sub)
        .subscribe( (resFeels : any) => {
          if(resFeels.message){
            //no tiene historico de peso
          }else{
            this.feels = resFeels;
          }
          this.loadedFeels = true;
         }, (err) => {
           console.log(err);
           this.loadedFeels = true;
           this.toastr.error('', this.translate.instant("generics.error try again"));
         }));
  }

  deleteFeel(event) {
    var date = this.dateService.transformDate(event.date);
    Swal.fire({
      title: this.translate.instant("generics.Are you sure delete") +' ('+date+ ") ?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#2F8BE6',
      cancelButtonColor: '#B0B6BB',
      confirmButtonText: this.translate.instant("generics.Accept"),
      cancelButtonText: this.translate.instant("generics.Cancel"),
      showLoaderOnConfirm: true,
      allowOutsideClick: false,
      reverseButtons: true
    }).then((result) => {
      if (result.value) {
        this.subscription.add( this.http.delete(environment.api+'/api/feel/'+event._id)
          .subscribe( (res : any) => {
            this.getFeels();
          }, (err) => {
            console.log(err);
          }));
            }
    });

  }

  back(){
    this.step = '0';
  }

}
