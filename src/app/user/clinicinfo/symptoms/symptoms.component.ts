import { Component, OnInit, Injectable, LOCALE_ID } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import { Clipboard } from "@angular/cdk/clipboard"
import { NgbModal, NgbModalRef, NgbModalOptions } from '@ng-bootstrap/ng-bootstrap';

import { environment } from 'environments/environment';
import { AuthGuard } from 'app/shared/auth/auth-guard.service';

import { Subscription } from 'rxjs/Subscription';
import { Observable, of, OperatorFunction } from 'rxjs';
import 'rxjs/add/observable/of';
import 'rxjs/add/operator/toPromise';
import { catchError, debounceTime, distinctUntilChanged, map, tap, switchMap, merge, mergeMap, concatMap } from 'rxjs/operators';

import { ApiDx29ServerService } from 'app/shared/services/api-dx29-server.service';
import { Apif29BioService } from 'app/shared/services/api-f29bio.service';

import { PatientService } from 'app/shared/services/patient.service';
import { AuthService } from 'app/shared/auth/auth.service';
import { SortService } from 'app/shared/services/sort.service';
import { SearchService } from 'app/shared/services/search.service';
import { EventsService } from 'app/shared/services/events.service';
import { DateService } from 'app/shared/services/date.service';

import { jsPDFService } from 'app/shared/services/jsPDF.service'
import { TrackEventsService } from 'app/shared/services/track-events.service';

import { DateAdapter } from '@angular/material/core';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';

import Swal from 'sweetalert2';

export function getCulture() {
  return sessionStorage.getItem('culture');
}

declare let gtag: any;

@Injectable()
export class SearchTermService {
  constructor(private apiDx29ServerService: ApiDx29ServerService) { }

  search(term: string) {
    if (term === '') {
      return of([]);
    }
    var info = {
      "text": term,
      "lang": sessionStorage.getItem('lang')
    }
    return this.apiDx29ServerService.searchSymptoms(info).pipe(
      map(response => response)
    );
  }
}

@Component({
  selector: 'app-symptoms',
  templateUrl: './symptoms.component.html',
  styleUrls: ['./symptoms.component.scss'],
  providers: [PatientService, ApiDx29ServerService, Apif29BioService, SearchTermService, jsPDFService, { provide: LOCALE_ID, useFactory: getCulture }],
})


export class SymptomsComponent implements OnInit {
  private subscription: Subscription = new Subscription();
  callListOfSymptoms: boolean = false;
  nothingFoundSymptoms: boolean = false;
  modelTemp: any;
  formatter1 = (x: { name: string }) => x.name;
  optionSymptomAdded: string = "";
  eventList: any = [];
  _startTime: any;
  showErrorMsg: boolean = false;
  sendSympTerms: boolean = false;
  ncrResultView: boolean = false;
  selectedInfoSymptomIndex: number = -1;
  modalReference: NgbModalRef;
  lang: string = 'en';
  showButtonScroll: boolean = false;
  userId: string = '';
  selectedPatient: any = {};
  loadedPatientId: boolean = false;
  loadedSymptoms: boolean = false;
  phenotype: any = {};
  phenotypeCopy: any = {};
  sending: boolean = false;
  private msgDataSavedOk: string;
  private msgDataSavedFail: string;
  today = new Date();

  constructor(private http: HttpClient, private authService: AuthService, public searchTermService: SearchTermService, private sortService: SortService, private searchService: SearchService, private modalService: NgbModal, public translate: TranslateService, private clipboard: Clipboard, private eventsService: EventsService, public jsPDFService: jsPDFService, private apiDx29ServerService: ApiDx29ServerService, private patientService: PatientService, private apif29BioService: Apif29BioService, private authGuard: AuthGuard, public toastr: ToastrService, private dateAdapter: DateAdapter<Date>, private dateService: DateService, public trackEventsService: TrackEventsService) {
    this._startTime = Date.now();
    this.lang = sessionStorage.getItem('lang');
    this.dateAdapter.setLocale(sessionStorage.getItem('lang'));
  }

  ngOnInit(): void {
    this.eventsService.on('changelang', function (lang) {
      this.lang = lang;
      this.modelTemp = '';
    }.bind(this));
    this.loadTranslations();
    this.initEnvironment();
  }

  loadTranslations() {
    this.translate.get('generics.Data saved successfully').subscribe((res: string) => {
      this.msgDataSavedOk = res;
    });
    this.translate.get('generics.Data saved fail').subscribe((res: string) => {
      this.msgDataSavedFail = res;
    });
  }

  initEnvironment() {
    this.initVariables();
    this.userId = this.authService.getIdUser();
    if (this.authService.getCurrentPatient() == null) {
      this.loadPatientId();
    } else {
      this.loadedPatientId = true;
      this.selectedPatient = this.authService.getCurrentPatient();
      this.loadSymptoms();
    }
  }

  initVariables() {
    this.phenotype = {
      validator_id: null,
      validated: false,
      date: null,
      data: [],
      _id: null
    };

    this.phenotypeCopy = {
      validator_id: null,
      validated: false,
      date: null,
      data: [],
      _id: null
    };
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
          this.loadSymptoms();
        }
      }, (err) => {
        console.log(err);
      }));
  }

  searchSymptoms: OperatorFunction<string, readonly string[]> = (text$: Observable<string>) =>
    text$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      tap(() => this.callListOfSymptoms = true),
      switchMap(term =>
        this.searchTermService.search(term).pipe(
          tap(() => this.nothingFoundSymptoms = false),
          catchError(() => {
            this.nothingFoundSymptoms = true;
            return of([]);
          }))
      ),
      tap(() => this.callListOfSymptoms = false)
    )

  selected($e) {
    $e.preventDefault();
    if (!$e.item.error) {
      var symptom = $e.item;
      var foundElement = this.searchService.search(this.phenotype.data, 'id', symptom.id);
      if (!foundElement) {
        this.phenotype.data.push({ id: symptom.id, name: symptom.name, new: true, checked: true, percentile: -1, inputType: 'manual', importance: '1', polarity: '0', onset: null, synonyms: symptom.synonyms, def: symptom.desc });
        this.phenotype.data.sort(this.sortService.GetSortOrder("name"));
        this.optionSymptomAdded = "Manual";
        this.lauchEvent("Symptoms");
        this.saveSymptomsToDb();
      } else {
        var foundElementIndex = this.searchService.searchIndex(this.phenotype.data, 'id', symptom.id);
        if (!this.phenotype.data[foundElementIndex].checked) {
          this.phenotype.data[foundElementIndex].checked = true;
        }
      }
    }
    this.modelTemp = '';
  }

  lauchEvent(category) {
    //traquear
    var secs = this.getElapsedSeconds();
    var savedEvent = this.searchService.search(this.eventList, 'name', category);
    if (category == "Symptoms") {
      var subCategory = category + ' - ' + this.optionSymptomAdded;
      var savedSubEvent = this.searchService.search(this.eventList, 'name', subCategory);
      if (!savedSubEvent) {
        this.eventList.push({ name: subCategory });
        this.trackEventsService.lauchEvent(subCategory);
      }
    }
    if (!savedEvent) {
      this.eventList.push({ name: category });
      this.trackEventsService.lauchEvent(category);
    }
  }

  getElapsedSeconds() {
    var endDate = Date.now();
    var seconds = (endDate - this._startTime) / 1000;
    return seconds;
  }

  focusOutFunctionSymptom() {
    if (this.showErrorMsg && this.modelTemp.length > 2) {
      this.sendSympTerms = true;
      var params: any = {}
      params.uuid = sessionStorage.getItem('uuid');
      params.Term = this.modelTemp;
      params.Lang = sessionStorage.getItem('lang');
      var d = new Date(Date.now());
      var a = d.toString();
      params.Date = a;
      this.subscription.add(this.http.post('https://prod-112.westeurope.logic.azure.com:443/workflows/95df9b0148cf409f9a8f2b0853820beb/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=OZyXnirC5JTHpc_MQ5IwqBugUqI853qek4o8qjNy7AA', params)
        .subscribe((res: any) => {
        }, (err) => {
        }));

    }
    this.modelTemp = '';
    this.callListOfSymptoms = false;
  }

  showMoreInfoSymptomPopup(symptomIndex, contentInfoSymptomNcr) {
    this.ncrResultView = false;
    this.selectedInfoSymptomIndex = symptomIndex;
    let ngbModalOptions: NgbModalOptions = {
      keyboard: false,
      windowClass: 'ModalClass-sm'// xl, lg, sm
    };
    this.modalReference = this.modalService.open(contentInfoSymptomNcr, ngbModalOptions);
  }

  deleteSymptom(symptom, index2) {
    var index = -1;
    var found = false;
    for (var i = 0; i < this.phenotype.data.length; i++) {
      if (symptom.id == this.phenotype.data[i].id) {
        index = i;
        found = true;
        this.confirmDeletePhenotype2(index, index2);
      }
    }
  }

  confirmDeletePhenotype2(index, index2) {
    Swal.fire({
      title: this.translate.instant("generics.Are you sure delete") + " " + this.phenotype.data[index].name + " ?",
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
        this.phenotype.data.splice(index, 1);
        this.lauchEvent("Delete symptoms");
        this.saveSymptomsToDb();
      }
    });

  }

  copySymptoms() {
    var infoSymptoms = this.getPlainInfoSymptoms();
    if (infoSymptoms != "") {
      this.clipboard.copy(this.getPlainInfoSymptoms());
      Swal.fire({
        icon: 'success',
        html: this.translate.instant("land.Symptoms copied to the clipboard"),
        showCancelButton: false,
        showConfirmButton: false,
        allowOutsideClick: false
      })
      setTimeout(function () {
        Swal.close();
      }, 2000);
      this.lauchEvent("Copy symptoms");

    } else {
      Swal.fire(this.translate.instant("land.To be able to copy the symptoms"), '', "warning");
    }
  }

  getPlainInfoSymptoms() {
    var resCopy = "";
    for (let i = 0; i < this.phenotype.data.length; i++) {
      resCopy = resCopy + this.phenotype.data[i].id + " - " + this.phenotype.data[i].name;
      if (i + 1 < this.phenotype.data.length) {
        resCopy = resCopy + "\n";
      }
    }
    return resCopy;
  }

  closeModal() {
    document.getElementsByClassName("ModalClass-sm")[0].removeEventListener("scroll", this.myFunction);
    if (this.modalReference != undefined) {
      this.modalReference.close();
      this.modalReference = undefined;
    }
  }

  myFunction() {
    document.getElementsByClassName("ModalClass-sm")[0]
      .addEventListener('scroll', function () {
        var height = document.getElementById('idBody').offsetHeight;
        var docHeight = $(document).height();
        var sizeele = $(".ModalClass-sm").scrollTop();
        if (height > docHeight) {
          if (sizeele <= (docHeight / 2)) {
            this.showButtonScroll = false;
          } else {
            this.showButtonScroll = true;
          }
        } else {
          this.showButtonScroll = false;
        }
      }.bind(this));
  }

  loadSymptoms() {
    this.loadedSymptoms = false;
    var para = this.authService.getCurrentPatient();
    //cargar el fenotipo del usuario
    this.subscription.add(this.apiDx29ServerService.getSymptoms(para.sub)
      .subscribe((res: any) => {
        if (res.message) {
          //no tiene fenotipo
          this.loadedSymptoms = true;
        } else {
          if (res.phenotype.data.length > 0) {
            res.phenotype.data.sort(this.sortService.GetSortOrder("name"));
            this.phenotype = res.phenotype;
            this.phenotypeCopy = JSON.parse(JSON.stringify(res.phenotype));
            var hposStrins = [];
            this.phenotype.data.forEach(function (element) {
              hposStrins.push(element.id);
            });
            //get symtoms
            this.callGetInfoTempSymptomsJSON(hposStrins);

            for (var j = 0; j < this.phenotype.data.length; j++) {
              this.phenotype.data[j].checked = true;
            }
            this.phenotypeCopy = JSON.parse(JSON.stringify(res.phenotype));
          } else {
            //no tiene fenotipo
            this.loadedSymptoms = true;
            this.phenotype = res.phenotype;
            this.phenotypeCopy = JSON.parse(JSON.stringify(res.phenotype));
          }
        }
        this.loadedSymptoms = true;
      }, (err) => {
        console.log(err);
        this.loadedSymptoms = true;
      }));
  }

  callGetInfoTempSymptomsJSON(hposStrins) {
    var lang = this.lang;
    this.subscription.add(this.apif29BioService.getInfoOfSymptoms(lang, hposStrins)
      .subscribe((res: any) => {

        var tamano = Object.keys(res).length;
        if (tamano > 0) {
          for (var i in res) {
            for (var j = 0; j < this.phenotype.data.length; j++) {
              if (res[i].id == this.phenotype.data[j].id) {
                this.phenotype.data[j].name = res[i].name;
                this.phenotype.data[j].def = res[i].desc;
                this.phenotype.data[j].synonyms = res[i].synonyms;
                this.phenotype.data[j].comment = res[i].comment;
                if (this.phenotype.data[j].importance == undefined) {
                  this.phenotype.data[j].importance = 1;
                }
              }
            }
          }
          this.phenotype.data.sort(this.sortService.GetSortOrder("name"));
        }
        this.lauchEvent("Symptoms");
        this.focusManualSymptoms();


      }, (err) => {
        console.log(err);
        this.lauchEvent("Symptoms");
        this.focusManualSymptoms();
      }));
  }

  focusManualSymptoms() {
    setTimeout(function () {
      if (this.phenotype.data.length == 0) {
        this.inputManualSymptomsElement.nativeElement.focus();
      }
    }.bind(this), 200);
  }

  saveSymptomsToDb() {
    if (this.authGuard.testtoken()) {
      this.sending = true;

      var phenotoSave = JSON.parse(JSON.stringify(this.phenotype));
      phenotoSave.data = [];
      for (var i = 0; i < this.phenotype.data.length; i++) {
        if (this.phenotype.data[i].inputType == undefined) {
          phenotoSave.data.push({ id: this.phenotype.data[i].id, inputType: 'unknown' });
        } else {
          phenotoSave.data.push({ id: this.phenotype.data[i].id, inputType: this.phenotype.data[i].inputType, importance: '1', polarity: '0', onset: this.phenotype.data[i].onset });
        }
      }
      //this.phenotype = JSON.parse(JSON.stringify(phenotoSave));
      phenotoSave.date = Date.now();
      this.phenotype.date = Date.now();
      if (this.phenotype._id == null) {
        this.subscription.add(this.http.post(environment.api + '/api/phenotypes/' + this.authService.getCurrentPatient().sub, phenotoSave)
          .subscribe((res: any) => {
            this.sending = false;
            this.phenotype._id = res.phenotype._id;
          }, (err) => {
            console.log(err);
            this.sending = false;
            if (err.error.message == 'Token expired' || err.error.message == 'Invalid Token') {
              this.authGuard.testtoken();
            } else {
              this.toastr.error('', this.msgDataSavedFail);
            }
          }));
      } else {
        this.subscription.add(this.http.put(environment.api + '/api/phenotypes/' + this.phenotype._id, phenotoSave)
          .subscribe((res: any) => {
            this.sending = false;
          }, (err) => {
            console.log(err.error);
            this.sending = false;
            if (err.error.message == 'Token expired' || err.error.message == 'Invalid Token') {
              this.authGuard.testtoken();
            } else {
              this.toastr.error('', this.msgDataSavedFail);
            }
          }));
      }
    }
  }

  closeDatePicker(eventData: any, index: any, dp?: any) {
    // get month and year from eventData and close datepicker, thus not allowing user to select date
    this.phenotype.data[index].onset = this.dateService.transformDate(eventData);
    this.saveSymptomsToDb();
    dp.close();
  }

  getLiteral(literal) {
    return this.translate.instant(literal);
  }

  updateSymptomsToDb() {
    this.subscription.add(this.http.put(environment.api + '/api/phenotypes/' + this.phenotype._id, this.phenotype)
      .subscribe((res: any) => {
        this.sending = false;
      }, (err) => {
        console.log(err.error);
        this.sending = false;
        if (err.error.message == 'Token expired' || err.error.message == 'Invalid Token') {
          this.authGuard.testtoken();
        } else {
          this.toastr.error('', this.msgDataSavedFail);
        }
      }));
  }

}
