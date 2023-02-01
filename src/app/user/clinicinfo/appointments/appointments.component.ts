import { Component, ChangeDetectionStrategy, ViewChild, TemplateRef, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from "@angular/router";
import { startOfDay, endOfDay,endOfHour, subDays, addDays, endOfMonth, isSameDay, isSameMonth, addHours } from 'date-fns';
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
import { CalendarEvent, CalendarEventAction, CalendarEventTimesChangedEvent } from 'angular-calendar';

const colors: any = {
  red: {
    primary: '#ad2121',
    secondary: '#FAE3E3'
  },
  blue: {
    primary: '#1e90ff',
    secondary: '#D1E8FF'
  },
  yellow: {
    primary: '#e3bc08',
    secondary: '#FDF1BA'
  }
};

@Component({
  selector: 'app-appointments',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './appointments.component.html',
  styleUrls: ['./appointments.component.scss'],
  providers: [PatientService]
})

export class AppointmentsComponent implements OnInit, OnDestroy{
  
  @ViewChild('modalContent') modalContent: TemplateRef<any>;

  view: string = 'month';

  newEvent: CalendarEvent;
  lastEvent: CalendarEvent;

  viewDate: Date = new Date();

  modalData: {
    action: string;
    event: CalendarEvent;
  };

  actions: CalendarEventAction[] = [
    {
      label: '<i class="fa fa-fw fa-pencil"></i>',
      onClick: ({ event }: { event: CalendarEvent }): void => {
        this.handleEvent('Edit this event', event);
      }
    },
    {
      label: '<i class="fa fa-fw fa-times"></i>',
      onClick: ({ event }: { event: CalendarEvent }): void => {
        //this.events = this.events.filter(iEvent => iEvent !== event);
        Swal.fire({
          title: this.translate.instant("generics.Are you sure?"),
          html: this.translate.instant("generics.Delete")+': '+ event.title,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#0CC27E',
          cancelButtonColor: '#FF586B',
          confirmButtonText: this.translate.instant("generics.Delete"),
          cancelButtonText: this.translate.instant("generics.No, cancel"),
          showLoaderOnConfirm: true,
          allowOutsideClick: false
      }).then((result) => {
        if (result.value) {
          this.eliminarSeizure(event);
        }
      });
        
      //this.handleEvent('This event is deleted!', event);
      }
    }
  ];

  refresh: Subject<any> = new Subject();

  events: CalendarEvent[] = [];

  activeDayIsOpen: boolean = true;
  loading: boolean = false;
  saving: boolean = false;
  selectedPatient: any = {};
  loadedPatientId: boolean = false;
  idOpen:string = null;
  locale: string = sessionStorage.getItem('lang')
  private subscription: Subscription = new Subscription();

  constructor(private http: HttpClient, private router: Router, private authService: AuthService, private authGuard: AuthGuard, private modal: NgbModal, public translate: TranslateService, public toastr: ToastrService, private patientService: PatientService, private route: ActivatedRoute, private sortService: SortService, private searchService: SearchService) { 
    this.subscription.add( this.route.params.subscribe(params => {
      if(params['id']!=undefined){
        this.idOpen = params['id'];
        //this.showListQuestionnaires = false;
      }else{
        this.idOpen = null;
      }
    }));
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  ngOnInit() {
    if (this.authService.getCurrentPatient() == null) {
      this.loadPatientId();
    } else {
      this.loadedPatientId = true;
      this.selectedPatient = this.authService.getCurrentPatient();
      this.loadData();
    }
    
  }

  loadPatientId() {
    this.loadedPatientId = false;
    this.subscription.add(this.patientService.getPatientId()
      .subscribe((res: any) => {
        if (res == null) {
          this.authService.logout();
        } else {
          this.loadedPatientId = true;
          this.authService.setCurrentPatient(res);
          this.selectedPatient = res;
          this.loadData();
        }
      }, (err) => {
        console.log(err);
      }));
  }

  updateEnd(modalData){
    this.modalData.event.end = endOfHour(modalData.event.start);
  }

  loadData(){
    this.events = [];
    this.loading = true;
    this.subscription.add( this.http.get(environment.api+'/api/appointments/'+this.authService.getCurrentPatient().sub)
        .subscribe( (res : any) => {
          if(res.message){
            //no tiene información
            this.events = [];
          }else{
            if(res.length>0){
              for(var i = 0; i < res.length; i++) {
                res[i].start = new Date(res[i].start);
                res[i].end = new Date(res[i].end);
                res[i].actions = this.actions;
                res[i].meta={
                  notes:res[i].notes,
                  _id:res[i]._id
                };

              }
             
              this.events = res;
              if(this.events.length>0){
                this.events.sort(this.sortService.DateSortInver("start"));
              }
              this.refresh.next();
              this.lastEvent = JSON.parse(JSON.stringify(res[0]));
              this.lastEvent.color = colors.red;
              this.lastEvent.meta._id =null;
            }else{
              this.events = [];
              this.refresh.next();
            }

          }
          this.loading = false;
          if(this.idOpen != null && res.length>0){
            var foundElementIndex = this.searchService.searchIndex(this.events, '_id', this.idOpen);
            if(foundElementIndex!=-1){
              var event = this.events[foundElementIndex];
              this.handleEvent('Edit this event', event);
            }
            this.idOpen = null;
          }
         }, (err) => {
           console.log(err);
           this.loading = false;
         }));
  }

  dayClicked({ date, events }: { date: Date; events: CalendarEvent[] }): void {
    if (isSameMonth(date, this.viewDate)) {
      if (
        (isSameDay(this.viewDate, date) && this.activeDayIsOpen === true) ||
        events.length === 0
      ) {
        this.activeDayIsOpen = false;
      } else {
        this.activeDayIsOpen = true;
        this.viewDate = date;
      }
     
    }
    Swal.fire({
      title: this.translate.instant("appointments.new?"),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#0CC27E',
      cancelButtonColor: '#FF586B',
      confirmButtonText: this.translate.instant("generics.Yes"),
      cancelButtonText: this.translate.instant("generics.No, cancel"),
      showLoaderOnConfirm: true,
      allowOutsideClick: false
  }).then((result) => {
    if (result.value) {
      this.addEvent(date);
    }
  });
    
  }

  handleEvent(action: string, event: CalendarEvent): void {
    //event.color = colors.red;
    this.modalData = { event, action };
    
    this.modal.open(this.modalContent, { size: 'md' });
  }

  addEvent(date): void {
    if(this.lastEvent!=undefined){
      this.newEvent = JSON.parse(JSON.stringify(this.lastEvent));
      if(date!=null){
        this.newEvent.start = startOfDay(date);
        this.newEvent.end = endOfHour(date);
      }
    }else{
      var actualDate = new Date()
      if(date!=null){
        actualDate = date;
      }
      this.newEvent = {
        id: null,
        title: this.translate.instant("appointments.New event"),
        start: startOfDay(actualDate),
        end: endOfHour(actualDate),
        color: colors.red,
        actions: this.actions,
        meta: {
          notes:"",
          _id:null
        }
      }
      
    }
    this.events.push(this.newEvent);

    // this.refresh.next();
    this.handleEvent('Add new event', this.newEvent);
    this.refresh.next();
  }

  saveData(param){
    this.lastEvent = JSON.parse(JSON.stringify(param));
    this.lastEvent.meta._id =null;
    if(this.authGuard.testtoken()){
      this.saving = true;
      delete param.actions;
      if(param.meta._id==null){
        delete param.meta._id;
        this.subscription.add( this.http.post(environment.api+'/api/appointments/'+this.authService.getCurrentPatient().sub, param)
        .subscribe( (res : any) => {
          this.saving = false;
          this.loadData();
         }, (err) => {
           console.log(err);
           this.saving = false;
           if(err.error.message=='Token expired' || err.error.message=='Invalid Token'){
             this.authGuard.testtoken();
           }else{
             //this.toastr.error('', this.msgDataSavedFail, { showCloseButton: true });
           }
         }));
      }else{
        this.subscription.add( this.http.put(environment.api+'/api/appointments/'+param.meta._id, param)
        .subscribe( (res : any) => {
          this.saving = false;
          this.loadData();
         }, (err) => {
           console.log(err.error);
           this.saving = false;
           if(err.error.message=='Token expired' || err.error.message=='Invalid Token'){
             this.authGuard.testtoken();
           }else{
             //this.toastr.error('', this.msgDataSavedFail, { showCloseButton: true });
           }
         }));
      }
    }
  }

  confirmDeleteSeizure(event){
    Swal.fire({
      title: this.translate.instant("generics.Are you sure?"),
      html: this.translate.instant("generics.Delete")+': '+ event.title,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#0CC27E',
      cancelButtonColor: '#FF586B',
      confirmButtonText: this.translate.instant("generics.Delete"),
      cancelButtonText: this.translate.instant("generics.No, cancel"),
      showLoaderOnConfirm: true,
      allowOutsideClick: false
    }).then((result) => {
      if (result.value) {
        this.eliminarSeizure(event);
      }
    }); 
  }

  eliminarSeizure(event){
    this.subscription.add( this.http.delete(environment.api+'/api/appointments/'+event.meta._id)
    .subscribe( (res : any) => {
      if (this.modal.hasOpenModals) {
        this.modal.dismissAll();
      }
      //this.toastr.success('', this.msgDataSavedOk, { showCloseButton: true });
      this.loadData()
     }, (err) => {
       console.log(err);
       if(err.error.message=='Token expired' || err.error.message=='Invalid Token'){
         this.authGuard.testtoken();
       }else{
         //this.toastr.error('', this.msgDataSavedFail, { showCloseButton: true });
       }
     }));
  }

  clearData(data){
    var emptydata = {
      id: data.id,
      notes:"",
      title: this.translate.instant("appointments.New event"),
      start: startOfDay(new Date()),
      end: endOfHour(new Date()),
      color: colors.red,
      actions: this.actions,
      meta: {
        notes:"",
        _id:null
      }
    }
    this.modalData.event=emptydata;
    this.refresh.next();
  }

  closeModal() {
    if (this.modal != undefined) {
      this.modal.dismissAll();
      this.loadData();
    }
  }
  
}
//Calendar event handler ends
