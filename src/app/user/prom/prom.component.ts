import { Component, ViewChild, TemplateRef, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { animate, keyframes, style, transition, trigger } from '@angular/animations';
import * as kf from '../home/keyframes';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
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

import {MatPaginator} from '@angular/material/paginator';
import {MatSort} from '@angular/material/sort';
import {MatTableDataSource} from '@angular/material/table';

@Component({
  selector: 'app-prom',
  templateUrl: './prom.component.html',
  styleUrls: ['./prom.component.scss'],
  animations: [
    trigger('fadeSlideInOut', [
      transition(':enter', [
        animate('500ms', style({ opacity: 1, transform: 'rotateY(180deg)' })),
      ]),
      transition(':leave', [
        animate('500ms', style({ opacity: 0, transform: 'rotateY(180deg)'})),
      ]),
    ]),
    trigger('cardAnimation', [
      //transition('* => wobble', animate(1000, keyframes (kf.wobble))),
      transition('* => swing', animate(1000, keyframes(kf.swing))),
      //transition('* => jello', animate(1000, keyframes (kf.jello))),
      //transition('* => zoomOutRight', animate(1000, keyframes (kf.zoomOutRight))),
      transition('* => slideOutLeft', animate(1000, keyframes(kf.slideOutRight))),
      transition('* => slideOutRight', animate(1000, keyframes(kf.slideOutLeft))),
      //transition('* => rotateOutUpRight', animate(1000, keyframes (kf.rotateOutUpRight))),
      transition('* => fadeIn', animate(1000, keyframes(kf.fadeIn))),
    ]),
  ],
  providers: [PatientService]
})
export class PromComponent implements OnInit, OnDestroy, AfterViewInit {
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
  eventsCopy: any = [];

  displayedColumns: string[] = ['typeTranslated', 'name', 'date', 'notes', 'actions'];
  dataSource: MatTableDataSource<any>;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  range = new FormGroup({
    start: new FormControl<Date | null>(null),
    end: new FormControl<Date | null>(null),
  });

  editing: boolean = false;
  actualRow: any = null;

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

  ngAfterViewInit() {
    
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
    this.eventsCopy = [];
    this.subscription.add( this.http.get(environment.api+'/api/events/'+this.authService.getCurrentPatient().sub)
    .subscribe( (res : any) => {
      if(res.message){
        //no tiene información
        this.dataSource = new MatTableDataSource([]);
      }else{
        if(res.length>0){
          res.sort(this.sortService.DateSort("dateInput"));
          for(let i=0; i<res.length; i++){
            var typeTranslated = res[i].type;
            if(typeTranslated == 'allergy'){
              typeTranslated = this.translate.instant('home.Allergy');
            }else if(typeTranslated == 'disease'){
              typeTranslated = this.translate.instant('home.Disease');
            }else if(typeTranslated == 'drug'){
              typeTranslated = this.translate.instant('home.Drug');
            }else if(typeTranslated == 'symptom'){
              typeTranslated = this.translate.instant('home.Symptom');
            }else if(typeTranslated == 'treatment'){
              typeTranslated = this.translate.instant('home.Treatment');
            }else if(typeTranslated == 'other'){
              typeTranslated = this.translate.instant('generics.Other');
            }
            res[i].typeTranslated = typeTranslated;
          }
            
          this.events = res;
          this.eventsCopy = JSON.parse(JSON.stringify(res));
           // Assign the data to the data source for the table to render
          this.dataSource = new MatTableDataSource(this.events);
          //this.refresh.next();
        }

      }
      this.editing=false;
      this.dataSource.paginator = this.paginator;
      this.dataSource.sort = this.sort;
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
          /*this.events.push(this.seizuresForm.value);
          this.eventsCopy.push(this.seizuresForm.value);*/
          this.submitted = false;
          this.seizuresForm.reset();
          this.step = '1';
          this.loadEvents();
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

  updateData(){
    console.log(this.seizuresForm)
    this.submitted = true;
    if (this.seizuresForm.invalid) {
        return;
    }
    
    if (this.seizuresForm.value.date != null) {
      this.seizuresForm.value.date = this.dateService.transformDate(this.seizuresForm.value.date);
    }
    if(this.authGuard.testtoken()){
      this.saving = true;
      this.subscription.add( this.http.put(environment.api+'/api/events/'+this.actualRow._id, this.seizuresForm.value)
        .subscribe( (res : any) => {
          this.saving = false;
          this.toastr.success('', this.msgDataSavedOk);
          this.submitted = false;
          this.seizuresForm.reset();
          this.step = '1';
          this.loadEvents();
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
    console.log(event)
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
    this.loadEvents();
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

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  showDates(contentDates){
    let ngbModalOptions: NgbModalOptions = {
      keyboard: false,
      windowClass: 'ModalClass-xs'// xl, lg, sm
    };
    this.modalReference = this.modalService.open(contentDates, ngbModalOptions);
  }

  closeModal() {
    if (this.modalReference != undefined) {
      this.modalReference.close();
      this.modalReference = undefined;
    }
  }

  applyRangeDates(){
    this.closeModal();
    //range.value.start - range.value.end
    console.log(this.range.value)
    var test = this.dateService.transformDate(this.range.value.start );
    var test2 = this.dateService.transformDate(this.range.value.end );
    this.events = this.eventsCopy.filter(x => new Date(x.date) >= new Date(test) && new Date(x.date) <= new Date(test2));
    console.log(this.events )

    //this.events =[];
    this.dataSource = new MatTableDataSource(this.events);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  clear(){
    if (this.modalReference != undefined) {
      this.modalReference.close();
      this.modalReference = undefined;
    }
    this.range.value.start = null;
    this.range.value.end = null;
    this.events = this.eventsCopy;
    this.dataSource = new MatTableDataSource(this.events);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  showForm(row){
    console.log(row)
    this.actualRow = row;
    this.step = '0';
    this.editing = true;
    this.seizuresForm.patchValue(row);
  }

}
