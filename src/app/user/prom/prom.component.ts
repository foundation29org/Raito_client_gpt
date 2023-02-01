import { Component, ViewChild, TemplateRef, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { startOfDay, endOfDay, subDays, addDays, endOfMonth, isSameDay, isSameMonth, addHours } from 'date-fns';
import { Router } from "@angular/router";
import { environment } from 'environments/environment';
import { HttpClient } from "@angular/common/http";
import { AuthService } from 'app/shared/auth/auth.service';
import { AuthGuard } from 'app/shared/auth/auth-guard.service';
import { ToastrService } from 'ngx-toastr';
import { DateService } from 'app/shared/services/date.service';
import { SortService } from 'app/shared/services/sort.service';
import { PatientService } from 'app/shared/services/patient.service';
import Swal from 'sweetalert2';
import { Subject } from 'rxjs/Subject';
import { TranslateService } from '@ngx-translate/core';
import { SearchService } from 'app/shared/services/search.service';
import { Subscription } from 'rxjs/Subscription';
import { NgbModal, NgbModalRef, NgbModalOptions } from '@ng-bootstrap/ng-bootstrap';
import { CordovaService } from 'app/shared/services/cordova.service';

@Component({
  selector: 'app-prom',
  templateUrl: './prom.component.html',
  styleUrls: ['./prom.component.scss'],
  providers: [PatientService]
})
export class PromComponent {
  @ViewChild('modalContent') modalContent: TemplateRef<any>;
  @ViewChild('modalGraphContent') modalGraphContent: TemplateRef<any>;

  view: string = 'month';


  viewDate: Date = new Date();


  refresh: Subject<any> = new Subject();

  activeDayIsOpen: boolean = true;
  loading: boolean = false;
  loadedEvents: boolean = false;
  saving: boolean = false;
  importing: boolean = false;

  private msgDataSavedOk: string;
  private msgDataSavedFail: string;
  step: string = '1';
  private subscription: Subscription = new Subscription();
  imported: number = 0;
  modalReference: NgbModalRef;
  seizuresForm: FormGroup;
  submitted = false;
  isMobile: boolean = false;
  events: any = [];

  constructor(private http: HttpClient, private router: Router, private authService: AuthService, private authGuard: AuthGuard, private modalService: NgbModal, public translate: TranslateService, public toastr: ToastrService, private searchService: SearchService, private dateService: DateService, private formBuilder: FormBuilder, private sortService: SortService, private patientService: PatientService, public cordovaService: CordovaService) { }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  ngOnInit() {
    this.isMobile = this.authService.getIsDevice();
    if(this.isMobile){
      this.cordovaService.checkPermissions();
    }

    this.seizuresForm = this.formBuilder.group({
      type: [null, Validators.required],
      name: ['', Validators.required],
      date: [new Date()],
      notes: []
  });
    this.loadData();
    this.loadTranslations();
  }

  get f() { return this.seizuresForm.controls; }

  loadTranslations(){
    this.translate.get('generics.Data saved successfully').subscribe((res: string) => {
      this.msgDataSavedOk=res;
    });
    this.translate.get('generics.Data saved fail').subscribe((res: string) => {
      this.msgDataSavedFail=res;
    });
  }

 loadData(){
    this.events = [];
    this.loading = true;
    this.subscription.add( this.patientService.getPatientId()
    .subscribe( (res : any) => {
      if(res!=null){
        this.loadEvents();
      }else{
        Swal.fire(this.translate.instant("generics.Warning"), this.translate.instant("personalinfo.Fill personal info"), "warning");
        this.router.navigate(['/user/basicinfo/personalinfo']);
      }
     }, (err) => {
       console.log(err);
       this.loading = false;
     }));
  }

  loadEvents(){
    this.loadedEvents=false;
    this.events =[];
    this.subscription.add( this.http.get(environment.api+'/api/events/'+this.authService.getCurrentPatient().sub)
    .subscribe( (res : any) => {
      if(res.message){
        //no tiene información
        this.events = [];
      }else{
        if(res.length>0){
          res.sort(this.sortService.DateSort("dateInput"));
          for(var i = 0; i < res.length; i++) {
            res[i].date = new Date(res[i].date);
          }
          this.events = res;
          this.refresh.next();
        }else{
          this.events = [];
        }

      }
      this.loadedEvents=true;
      this.loading = false;
     }, (err) => {
       console.log(err);
       this.loadedEvents=true;
       this.loading = false;
     }));
  }

  saveData(){
    this.submitted = true;
    if (this.seizuresForm.invalid) {
        return;
    }
    
    if (this.seizuresForm.value.date != null) {
      this.seizuresForm.value.date = this.dateService.transformDate(this.seizuresForm.value.date);
    }
    if(this.authGuard.testtoken()){
      this.saving = true;
      this.subscription.add( this.http.post(environment.api+'/api/events/'+this.authService.getCurrentPatient().sub, this.seizuresForm.value)
        .subscribe( (res : any) => {
          this.saving = false;
          this.toastr.success('', this.msgDataSavedOk);
          this.events.push(this.seizuresForm.value);
          this.submitted = false;
          this.seizuresForm.reset();
          this.step = '1';
         }, (err) => {
           console.log(err);
           this.saving = false;
           if(err.error.message=='Token expired' || err.error.message=='Invalid Token'){
             this.authGuard.testtoken();
           }else{
           }
         }));
    }
  }

  deleteSeizure(event) {
    Swal.fire({
      title: this.translate.instant("generics.Are you sure delete") + "?",
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
        this.subscription.add( this.http.delete(environment.api+'/api/events/'+event._id)
          .subscribe( (res : any) => {
            this.loadEvents();
            //this.toastr.success('', this.msgDataSavedOk, { showCloseButton: true });
          }, (err) => {
            console.log(err);
            if(err.error.message=='Token expired' || err.error.message=='Invalid Token'){
              this.authGuard.testtoken();
            }else{
              //this.toastr.error('', this.msgDataSavedFail, { showCloseButton: true });
            }
          }));
            }
    });

  }

  openStats(){
    this.step = '1';
  }

  goto(index){
    this.step = index;
  }

  getLiteral(literal) {
    return this.translate.instant(literal);
  }

  filterNewProms(){
  }

  showAll(){
  }

}
