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

interface MyEvent{
  _id: any;
  GUID: any;
  type: any;
  duracion: any;
  notes: any;
  state: any,
  start: any;
}

@Component({
  selector: 'app-calendar',
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss'],
  providers: [PatientService]
})

export class CalendarsComponent implements OnInit, OnDestroy{
  @ViewChild('modalContent') modalContent: TemplateRef<any>;
  @ViewChild('modalGraphContent') modalGraphContent: TemplateRef<any>;

  view: string = 'month';

  newEvent: MyEvent;
  lastEvent: MyEvent;

  viewDate: Date = new Date();

  modalData: {
    action: string;
    event: MyEvent;
  };

  refresh: Subject<any> = new Subject();

  events: MyEvent[] = [];

  activeDayIsOpen: boolean = true;
  loading: boolean = false;
  saving: boolean = false;
  importing: boolean = false;

  private msgDataSavedOk: string;
  private msgDataSavedFail: string;
  step: string = '0';
  private subscription: Subscription = new Subscription();
  imported: number = 0;
  modalReference: NgbModalRef;
  seizuresForm: FormGroup;
  submitted = false;
  isMobile: boolean = false;

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
      duracion: ['', Validators.required],
      start: [new Date(), Validators.required],
      state: [],
      notes: []
  });
    this.loadData();
    this.addEvent();
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
    this.events =[];
    this.subscription.add( this.http.get(environment.api+'/api/seizures/'+this.authService.getCurrentPatient().sub)
    .subscribe( (res : any) => {
      if(res.message){
        //no tiene información
        this.events = [];
      }else{
        if(res.length>0){
          res.sort(this.sortService.DateSort("start"));
          for(var i = 0; i < res.length; i++) {
            res[i].start = new Date(res[i].start);
          }
          this.events = res;
          this.refresh.next();
          this.lastEvent = JSON.parse(JSON.stringify(res[0]));
          this.lastEvent._id =null;
        }else{
          this.events = [];
          this.step = '0';
        }

      }
      this.loading = false;
     }, (err) => {
       console.log(err);
       this.loading = false;
     }));
  }

  dayClicked({ date, events }: { date: Date; events: MyEvent[] }): void {
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
  }

  handleEvent(action: string, event: MyEvent): void {
    this.modalData = { event, action };
    //this.modal.open(this.modalContent, { size: 'lg' });
  }

  addEvent(): void {
    /*if(this.lastEvent!=undefined){
      this.newEvent = JSON.parse(JSON.stringify(this.lastEvent));
      }
    }else{
    }*/
    this.newEvent = {
      _id: null,
      GUID: '',
      type: null,
      duracion: 0,
      state:"",
      notes:"",
      start: startOfDay(new Date()),
    }

    //this.events.push(this.newEvent);

    // this.refresh.next();
    this.handleEvent('Save seizure', this.newEvent);
     this.refresh.next();
  }

  saveData(){
    this.submitted = true;
    if (this.seizuresForm.invalid) {
        return;
    }
    
    if (this.seizuresForm.value.start != null) {
      this.seizuresForm.value.start = this.dateService.transformDate(this.seizuresForm.value.start);
    }
    this.lastEvent = JSON.parse(JSON.stringify(this.seizuresForm.value));
    this.lastEvent._id =null;
    if(this.authGuard.testtoken()){
      this.saving = true;
      this.subscription.add( this.http.post(environment.api+'/api/seizures/'+this.authService.getCurrentPatient().sub, this.seizuresForm.value)
        .subscribe( (res : any) => {
          this.saving = false;
          this.toastr.success('', this.msgDataSavedOk);
          this.events.push(this.seizuresForm.value);
          this.submitted = false;
          this.seizuresForm.reset();
          this.addEvent();
          this.router.navigate(['/home']);
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

  onImport(event) {
    var file = event.srcElement.files[0];
    if (file) {
        var reader = new FileReader();
        reader.readAsText(file, "UTF-8");
        reader.onload = (evt:any) => {
          var seizuresToUpload=JSON.parse(evt.target.result);
          if(seizuresToUpload.Seizures==undefined){
            this.toastr.error('', this.translate.instant("seizures.invalidFile"));
          }else{
            this.uploadSeizures(seizuresToUpload.Seizures);
          }
          
        }
        reader.onerror = function (evt) {
            console.log('error reading file');
        }
    }
  }

  uploadSeizures(seizurelist){
    this.imported = 0;
    var listToUpload = [];
    this.importing = true;
    for(var i = 0; i < seizurelist.length; i++) {
      //inicio variables

      var newEvent = {
        GUID: '',
        type: null,
        duracion: 0,
        state:"",
  		  notes:"",
        start: startOfDay(new Date()),
      }
			var cogerhora = seizurelist[i].Date_Time.split(' ');

			newEvent.notes = newEvent.notes + this.parsearacentos(seizurelist[i].triggernotes);//no va
			newEvent.notes = newEvent.notes + this.parsearacentos(seizurelist[i].descriptothervalue);//no va
			newEvent.notes = newEvent.notes + this.parsearacentos(seizurelist[i].descriptnotes);//no va
			newEvent.notes = newEvent.notes + this.parsearacentos(seizurelist[i].postnotes);

      var parsedate = cogerhora[0]+"T00:00:00.000Z";
      newEvent.GUID= seizurelist[i].DateTimeEntered;
      /*if(seizurelist[i].GUID==undefined){
        newEvent.GUID= seizurelist[i].DateTimeEntered;
      }else{
        newEvent.GUID= seizurelist[i].GUID.trim();
      }*/
      
      newEvent.type = this.obtenerTipoConvImportar(seizurelist[i].type);
      if(parseInt(seizurelist[i].length_min)>=60){
        newEvent.duracion = (parseInt(seizurelist[i].length_hr)+1)*60+(parseInt(seizurelist[i].length_min)-60);
			}else{
        newEvent.duracion = seizurelist[i].length_hr*60+parseInt(seizurelist[i].length_min);
			}
      newEvent.start=new Date(parsedate);

			listToUpload.push(newEvent);
    }

    //guardar en la base de datos listToUpload
    this.saveMassiveSeizures(listToUpload);
  }

  obtenerTipoConvImportar(formatotraducion){
    var resultado=formatotraducion;
    if(formatotraducion=="Unknown"){
              resultado="Unknown";
      }else if(formatotraducion=="Simple Partial"){
             resultado="Simple Focal";
      }else if(formatotraducion=="Complex Partial"){
             resultado="Complex Focal";
      }else if(formatotraducion=="Secondarily Generalized"){
             resultado="Secondarily Generalized";
      }else if(formatotraducion=="Tonic"){
             resultado="Tonic";
      }else if(formatotraducion=="Clonic"){
             resultado="Clonic";
      }else if(formatotraducion=="Tonic Clonic"){
             resultado="Tonic–clonic";
      }else if(formatotraducion=="Myoclonic"){
             resultado="Myoclonic";
      }else if(formatotraducion=="Myoclonic Cluster"){
             resultado="Myoclonic Cluster";
      }else if(formatotraducion=="Atonic"){
             resultado="Atonic";
      }else if(formatotraducion=="Absence"){
             resultado="Absence";
      }else if(formatotraducion=="Atypical Absence"){
             resultado="Atypical Absence";
      }else if(formatotraducion=="Infantile Spasms (cluster)"){
             resultado="Infantile Spasms";
      }else if(formatotraducion=="Status"){
             resultado="Status";
      }else if(formatotraducion=="Other"){
             resultado="Other";
      }else{
             resultado="Other";
      }
      return resultado;
  }

  parsearacentos(textoparsear){
    var foo=textoparsear;

    if(foo.indexOf('\r')!=-1){
     foo=foo.replace("\r", ' ');
    }
    if(foo.indexOf('\n')!=-1){
     foo=foo.replace("\n", ' ');
    }

    //á
    if(foo.indexOf('\u00e1')!=-1){
     foo=foo.replace("\u00e1", 'á');
    }
    //é
    if(foo.indexOf('\u00e9')!=-1){
     foo=foo.replace("\u00e9", 'é');
    }
    //í
    if(foo.indexOf('\u00ed')!=-1){
     foo=foo.replace("\u00ed", 'í');
    }
    //ó
    if(foo.indexOf('\u00f3')!=-1){
     foo=foo.replace("\u00f3", 'ó');
    }
    //ú
    if(foo.indexOf('\u00fa')!=-1){
     foo=foo.replace("\u00fa", 'ú');
    }
    //Á
    if(foo.indexOf('\u00c1')!=-1){
     foo=foo.replace("\u00c1", 'Á');
    }
    //É
    if(foo.indexOf('\u00c9')!=-1){
     foo=foo.replace("\u00c9", 'É');
    }
    //Ó
    if(foo.indexOf('\u00d3')!=-1){
     foo=foo.replace("\u00d3", 'Ó');
    }
    //Ú
    if(foo.indexOf('\u00da')!=-1){
     foo=foo.replace("\u00da", 'Ú');
    }
    //ñ
    if(foo.indexOf('\u00f1')!=-1){
     foo=foo.replace("\u00f1", 'ñ');
    }
    //Ñ
    if(foo.indexOf('\u00d1')!=-1){
     foo=foo.replace("\u00d1", 'Ñ');
    }
    return foo;
}

  saveMassiveSeizures(listToUpload){
    this.subscription.add( this.http.post(environment.api+'/api/massiveseizures/'+this.authService.getCurrentPatient().sub, listToUpload)
    .subscribe( (res : any) => {
      //this.toastr.success('', this.msgDataSavedOk, { showCloseButton: true });
      for(var i = 0; i < listToUpload.length; i++) {
        var foundElementDrugIndex = this.searchService.searchIndex(this.events, 'GUID', listToUpload[i].GUID);
        if(foundElementDrugIndex==-1){
          this.events.push(listToUpload[i]);
          this.imported++;
        }
      }
      this.refresh.next();
      this.importing = false;
      if(this.imported>0){
        var msg = this.translate.instant("seizures.Imported seizures") + " " +this.imported;
        Swal.fire('', msg, "success");
        //this.toastr.success('', 'Imported seizures: '+ listToUpload.length);
      }else{
        var msg2 = this.translate.instant("seizures.no imported");
        Swal.fire('', msg2, "warning");
        //this.toastr.success('', 'It has not imported any seizure because they were all imported, or there were none in the file.');
      }
      this.loadEvents();
     }, (err) => {
       console.log(err);
       this.importing = false;
       if(err.error.message=='Token expired' || err.error.message=='Invalid Token'){
         this.authGuard.testtoken();
       }else{
         //this.toastr.error('', this.msgDataSavedFail, { showCloseButton: true });
       }
     }));
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
        this.subscription.add( this.http.delete(environment.api+'/api/seizures/'+event._id)
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

  clearData(data){
    var emptydata = {
      _id: data._id,
      GUID: '',
      type: null,
      duracion: 0,
      state:"",
      notes:"",
      start: startOfDay(new Date()),
    }
    this.modalData.event=emptydata;
    this.refresh.next();
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

  closeDatePickerStart(eventData: any, dp?: any) {
    // get month and year from eventData and close datepicker, thus not allowing user to select date
    this.modalData.event.start = eventData;
    this.seizuresForm.value.start = eventData;
    dp.close();
  }

  showHelpSeizureTrackerPopup(contentInfoSeizureTracker) {
    let ngbModalOptions: NgbModalOptions = {
      keyboard: false,
      windowClass: 'ModalClass-sm'// xl, lg, sm
    };
    this.modalReference = this.modalService.open(contentInfoSeizureTracker, ngbModalOptions);
  }

  closeModal() {
    if (this.modalReference != undefined) {
      this.modalReference.close();
      this.modalReference = undefined;
    }
  }
}
//Calendar event handler ends
