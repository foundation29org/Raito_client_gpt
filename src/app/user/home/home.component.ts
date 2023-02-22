import { Component, OnInit, OnDestroy, HostListener, ElementRef, ViewChild } from '@angular/core';
import { animate, keyframes, style, transition, trigger } from '@angular/animations';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import * as kf from './keyframes';
import { Router } from "@angular/router";
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from 'environments/environment';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from 'app/shared/auth/auth.service';
import { AuthGuard } from 'app/shared/auth/auth-guard.service';
import { PatientService } from 'app/shared/services/patient.service';
import { ToastrService } from 'ngx-toastr';
import { SearchService } from 'app/shared/services/search.service';
import { SortService } from 'app/shared/services/sort.service';
import 'rxjs/add/observable/of';
import 'rxjs/add/operator/toPromise';
import { DateService } from 'app/shared/services/date.service';
import { SearchFilterPipe } from 'app/shared/services/search-filter.service';
import { TrackEventsService } from 'app/shared/services/track-events.service';
import { Subscription } from 'rxjs/Subscription';
import Swal from 'sweetalert2';
import { DateAdapter } from '@angular/material/core';
import { ApiDx29ServerService } from 'app/shared/services/api-dx29-server.service';

import { OpenAiService } from 'app/shared/services/openAi.service';
import 'hammerjs';

import { DataEvent } from './../prom/dataevent';

const defaultLocale = 'en-US';

interface Window {
  WebChat?: any;
}

declare var window: Window;

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  animations: [
    trigger('fadeSlideInOut', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(100%)' }),
        animate('500ms', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
      transition(':leave', [
        animate('500ms', style({ opacity: 0, transform: 'translateY(-100%)' })),
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
  providers: [PatientService, OpenAiService, ApiDx29ServerService]
})

export class HomeComponent implements OnInit, OnDestroy {
  messages = [];
  message = '';
  callingOpenai: boolean = false;

  patient: any;
  private subscription: Subscription = new Subscription();
  timeformat = "";
  lang = 'en';
  loadedPatientId: boolean = false;
  selectedPatient: any = {};
  basicInfoPatient: any;
  basicInfoPatientCopy: any;
  loadedInfoPatient: boolean = false;
  checking: boolean = false;
  userInfo: any = {};
  step = 0;
  patientInfo: any = {
    patientAllergies: [],
    patientDiseases: [],
    patientMedications: []
  };

  newDisease: any = { name: '', date: '' };
  newAlergy: any = { name: '' };
  newDrug: any = { name: '', date: '' };

  valueProm: any = {};

  maxDate = new Date();
  responseEntities = "";
  posibleEntities = [];

  loadedEvents: boolean = false;
  loadingPosibleEntities: boolean = false;

  currentIndex = 0;
  currentEntity = this.posibleEntities[this.currentIndex];
  swipeDirection: 'left' | 'right' | null = null;
  animationState: string;
  private _threshold = 15;
  @ViewChild("panelcard") _el: ElementRef;
  detectedLang: string = 'en';

  callingTextAnalytics: boolean = false;
  resTextAnalyticsSegments: any;
  events = [];

  status: number = -1;
  statusText: string = '';
  response: string = '';
  callgpt: boolean = false;
  restartBot: boolean = false;
  intent: string = '';

  seizuresForm: FormGroup;
  saving: boolean = false;
  private msgDataSavedOk: string;
  submitted = false;
  tempInput: string = '';

  constructor(private http: HttpClient, public translate: TranslateService, private authService: AuthService, private patientService: PatientService, public searchFilterPipe: SearchFilterPipe, public toastr: ToastrService, private dateService: DateService, private sortService: SortService, private adapter: DateAdapter<any>, private searchService: SearchService, private router: Router, public trackEventsService: TrackEventsService, private openAiService: OpenAiService, private apiDx29ServerService: ApiDx29ServerService, private formBuilder: FormBuilder, private authGuard: AuthGuard) {
    this.adapter.setLocale(this.authService.getLang());
    this.lang = this.authService.getLang();
    switch (this.authService.getLang()) {
      case 'en':
        this.timeformat = "M/d/yy";
        break;
      case 'es':
        this.timeformat = "d/M/yy";
        break;
      case 'nl':
        this.timeformat = "d-M-yy";
        break;
      default:
        this.timeformat = "M/d/yy";
        break;

    }
    /*this.posibleEntities = [
          {
            "name": "Síndrome de Dravet",
            "type": "disease",
            "subtype": '',
            "date": null,
            "notes": "",
            "data": {},
            "deleted": false
          },
          {
            "name": "Ácido valproico",
            "type": "drug",
            "subtype": '',
            "date": null,
            "notes": "",
            "data": {
              "name": "Valproic Acid",
              "value": "",
              "link": "N03AG01"
            },
            "deleted": false
          },
          {
            "name": "Clobazam",
            "type": "drug",
            "subtype": '',
            "date": null,
            "notes": "",
            "data": {
              "name": "Clobazam",
              "value": "",
              "link": "N05BA09"
            },
            "deleted": false
          },
          {
            "name": "Estiripentol",
            "type": "drug",
            "subtype": '',
            "date": null,
            "notes": "",
            "data": {
              "name": "Stiripentol",
              "value": "",
              "link": "N03AX17"
            },
            "deleted": false
          },
          {
            "name": "Topiramato",
            "type": "drug",
            "subtype": '',
            "date": null,
            "notes": "",
            "data": {
              "name": "Topiramate",
              "value": "",
              "link": "N03AX11"
            },
            "deleted": false
          },
          {
            "name": "Levetiracetam",
            "type": "drug",
            "subtype": '',
            "date": null,
            "notes": "",
            "data": {
              "name": "Levetiracetam",
              "value": "",
              "link": "N03AX14"
            },
            "deleted": false
          },
          {
            "name": "convulsiones",
            "type": "symptom",
            "subtype": '',
            "date": null,
            "notes": "",
            "data": {},
            "deleted": false
          }
        ];
        this.currentEntity = this.posibleEntities[this.currentIndex];*/
  }

  startAnimation(state) {
    console.log(state)
    if (!this.animationState) {
      this.animationState = state;
    }
  }
  resetAnimationState() {
    this.animationState = '';
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }


  ngOnInit() {
    this.initEnvironment();

    this.initChat()

    this.seizuresForm = this.formBuilder.group({
      type: [null, Validators.required],
      subtype: [],
      name: ['', Validators.required],
      date: [new Date()],
      data: this.formBuilder.group(new DataEvent()),
      notes: []
    });

    this.translate.get('generics.Data saved successfully').subscribe((res: string) => {
      this.msgDataSavedOk=res;
    });
  }

  get f() { return this.seizuresForm.controls; }

  initChat() {
    this.messages.push({
      text: this.translate.instant("home.7.5"),
      isUser: false
    });
  }

  initEnvironment() {
    //this.userId = this.authService.getIdUser();
    console.log(this.authService.getCurrentPatient())
    if (this.authService.getCurrentPatient() == null) {
      this.loadPatientId();
    } else {
      this.loadedPatientId = true;
      this.selectedPatient = this.authService.getCurrentPatient();
      this.getInfoPatient();
    }
  }

  loadPatientId() {
    this.loadedPatientId = false;
    this.subscription.add(this.patientService.getPatientId()
      .subscribe((res: any) => {
        if (res == null) {
          this.authService.logout();
          //this.router.navigate([this.authService.getLoginUrl()]);
        } else {
          this.loadedPatientId = true;
          this.authService.setCurrentPatient(res);
          this.selectedPatient = res;
          this.getInfoPatient();
        }
      }, (err) => {
        console.log(err);
      }));
  }

  getInfoPatient() {
    //this.loadedInfoPatient = false;
    this.subscription.add(this.http.get(environment.api + '/api/patients/' + this.authService.getCurrentPatient().sub)
      .subscribe((res: any) => {
        console.log(res)
        this.basicInfoPatient = res.patient;
        this.basicInfoPatient.birthDate = this.dateService.transformDate(res.patient.birthDate);
        this.basicInfoPatientCopy = JSON.parse(JSON.stringify(res.patient));
        this.loadedInfoPatient = true;
        if (this.basicInfoPatient.wizardCompleted) {
          this.step = 7;
        } else {
          console.log(this.basicInfoPatient);
          if (this.basicInfoPatient.birthDate == null) {
            this.step = 1;
          } else if (this.basicInfoPatient.gender == null) {
            this.step = 3;
          } else {
            this.step = 4;
          }
        }
        this.loadEvents();
        this.getUserInfo();
      }, (err) => {
        console.log(err);
        this.loadedInfoPatient = true;
        this.toastr.error('', this.translate.instant("generics.error try again"));
      }));
  }

  loadEvents() {
    this.loadedEvents = false;
    this.patientInfo = {
      patientAllergies: [],
      patientDiseases: [],
      patientMedications: []
    };

    this.subscription.add(this.http.get(environment.api + '/api/events/' + this.authService.getCurrentPatient().sub)
      .subscribe((res: any) => {
        if (res.message) {
          //no tiene información
        } else {
          if (res.length > 0) {
            res.sort(this.sortService.DateSort("dateInput"));
            this.events = res;
            for (var i = 0; i < res.length; i++) {
              if (res[i].type == "allergy") {
                this.patientInfo.patientAllergies.push(res[i]);
              } else if (res[i].type == "disease") {
                this.patientInfo.patientDiseases.push(res[i]);
              } else if (res[i].type == "drug") {
                this.patientInfo.patientMedications.push(res[i]);
              }
            }
            if (!this.basicInfoPatient.wizardCompleted) {
              if (this.patientInfo.patientAllergies.length > 0) {
                this.step = 5;
              }
              if (this.patientInfo.patientDiseases.length > 0) {
                this.step = 6;
              }
              if (this.patientInfo.patientMedications.length > 0) {
                this.step = 7;
                this.setWizardDone();
              }
            }
          }
        }
        this.loadedEvents = true;
      }, (err) => {
        console.log(err);
        this.loadedEvents = true;
      }));
  }

  getUserInfo() {
    this.checking = true;
    this.subscription.add(this.http.get(environment.api + '/api/users/name/' + this.authService.getIdUser())
      .subscribe((res: any) => {
        console.log(res)
        this.userInfo = res;
      }, (err) => {
        console.log(err);
        this.checking = false;
      }));

  }


  lauchEvent(category) {
    this.trackEventsService.lauchEvent(category);
  }

  start() {
    this.step = 2;
  }

  goBack() {
    this.step--;
  }

  submitAge() {
    if (!this.basicInfoPatient.birthDate) {
      return;
    }
    this.basicInfoPatient.birthDate = this.dateService.transformDate(this.basicInfoPatient.birthDate)
    var paramssend = { birthDate: this.basicInfoPatient.birthDate };
    this.subscription.add(this.http.put(environment.api + '/api/patient/birthdate/' + this.authService.getCurrentPatient().sub, paramssend)
      .subscribe((res: any) => {

      }, (err) => {
        console.log(err.error);
      }));
    this.step = 3;
  }

  submitGender() {
    var paramssend = { gender: this.basicInfoPatient.gender };
    this.subscription.add(this.http.put(environment.api + '/api/patient/gender/' + this.authService.getCurrentPatient().sub, paramssend)
      .subscribe((res: any) => {

      }, (err) => {
        console.log(err.error);
      }));
    this.step = 4;
  }


  removeAlergy(index) {
    this.patientInfo.patientAllergies.splice(index, 1);
  }

  addAlergy() {
    if (!this.newAlergy) {
      return;
    }
    this.patientInfo.patientAllergies.push({ name: this.newAlergy.name });
    this.newAlergy = { name: '' };
  }

  submitAllergies() {
    var listToUpload = [];
    for (var i = 0; i < this.patientInfo.patientAllergies.length; i++) {
      listToUpload.push({ name: this.patientInfo.patientAllergies[i].name, type: 'allergy' });
    }
    this.saveMassiveEvents(listToUpload);

    this.step = 5;
  }

  skipAllergies() {
    this.step = 5;
  }

  submitDiseases() {
    var listToUpload = [];
    for (var i = 0; i < this.patientInfo.patientDiseases.length; i++) {
      listToUpload.push({ name: this.patientInfo.patientDiseases[i].name, date: this.patientInfo.patientDiseases[i].date, type: 'disease' });
    }
    this.saveMassiveEvents(listToUpload);
    this.step = 6;
  }

  removeDisease(index) {
    this.patientInfo.patientDiseases.splice(index, 1);
  }

  addDisease() {
    if (!this.newDisease) {
      return;
    }
    this.patientInfo.patientDiseases.push({ name: this.newDisease.name, date: this.newDisease.date });
    this.newDisease = { name: '', date: '' };
  }

  skipDiseases() {
    this.step = 6;
  }

  removeMedication(index) {
    this.patientInfo.patientMedications.splice(index, 1);
  }

  addMedication() {
    if (!this.newDrug) {
      return;
    }
    this.patientInfo.patientMedications.push({ name: this.newDrug.name, date: this.newDrug.date });
    this.newDrug = { name: '', date: '' };
  }

  finishWizard() {
    var listToUpload = [];
    for (var i = 0; i < this.patientInfo.patientMedications.length; i++) {
      listToUpload.push({ name: this.patientInfo.patientMedications[i].name, date: this.patientInfo.patientMedications[i].date, type: 'drug' });
    }
    this.saveMassiveEvents(listToUpload);
    this.setWizardDone();
    this.step = 7;
  }

  setWizardDone() {
    var paramssend = { wizardCompleted: true };
    this.subscription.add(this.http.put(environment.api + '/api/patient/wizard/' + this.authService.getCurrentPatient().sub, paramssend)
      .subscribe((res: any) => {

      }, (err) => {
        console.log(err.error);
      }));
  }


  closeDatePickerDisease(eventData: any, index: any, dp?: any) {
    this.newDisease.date = eventData;
    dp.close();
  }

  closeDatePickerDrug(eventData: any, index: any, dp?: any) {
    this.newDrug.date = eventData;
    dp.close();
  }

  ageFromDateOfBirthday(dateOfBirth: any) {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    var months;
    months = (today.getFullYear() - birthDate.getFullYear()) * 12;
    months -= birthDate.getMonth();
    months += today.getMonth();
    var age = 0;
    if (months > 0) {
      age = Math.floor(months / 12)
    }
    var res = months <= 0 ? 0 : months;
    var m = res % 12;
    //this.age = {years:age, months:m }
    return age;
  }

  saveMassiveEvents(listToUpload) {
    this.subscription.add(this.http.post(environment.api + '/api/massiveevents/' + this.authService.getCurrentPatient().sub, listToUpload)
      .subscribe((res: any) => {
      }, (err) => {
        console.log(err);
      }));
  }

  differenceInDays(date1: string, date2: string) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const timeDiff = Math.abs(d2.getTime() - d1.getTime());
    const diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
    return diffDays;
  }

  sendMessage() {
    if (!this.message) {
      return;
    }
    this.responseEntities = "";
    this.messages.push({
      text: this.message,
      isUser: true
    });

    this.callingOpenai = true;
    var promIntent = this.translate.instant("home.prom0");
    this.valueProm = { value: promIntent + this.message };
    this.tempInput = this.message;
    var testLangText = this.message.substr(0, 4000)
    if (testLangText.length > 0) {
      this.subscription.add(this.apiDx29ServerService.getDetectLanguage(testLangText)
        .subscribe((res: any) => {
          if (res[0].language != 'en') {
            this.detectedLang = res[0].language;
            var info = [{ "Text": this.message }]
            this.subscription.add(this.apiDx29ServerService.getTranslationDictionary(res[0].language, info)
              .subscribe((res2: any) => {
                var textToTA = this.message.replace(/\n/g, " ");
                if (res2[0] != undefined) {
                  if (res2[0].translations[0] != undefined) {
                    textToTA = res2[0].translations[0].text;
                    this.tempInput = res2[0].translations[0].text;
                  }
                }
                this.valueProm = { value: promIntent + textToTA };
                this.continueSendIntent(textToTA);
              }, (err) => {
                console.log(err);
                this.continueSendIntent(this.message);
              }));
          } else {
            this.detectedLang = 'en';
            this.continueSendIntent(this.message);
          }

        }, (err) => {
          console.log(err);
          this.toastr.error('', this.translate.instant("generics.error try again"));
        }));
    } else {
      this.continueSendIntent(this.message);
    }
  }

  continueSendIntent(msg) {
    Swal.fire({
      title: this.translate.instant("generics.Please wait"),
      showCancelButton: false,
      showConfirmButton: false,
      allowOutsideClick: false
    }).then((result) => {

    });
    this.subscription.add(this.openAiService.postOpenAi(this.valueProm)
      .subscribe((res: any) => {
        console.log(res)
        let tempAnswer = res.choices[0].text;
        let answer = tempAnswer
        if (res.choices[0].text.indexOf("\n\n") == 0) {
          tempAnswer = res.choices[0].text.split("\n\n");
          tempAnswer.shift();
          answer = tempAnswer[0];
        } else if (res.choices[0].text.indexOf("\n") == 0) {
          tempAnswer = res.choices[0].text.split("\n");
          tempAnswer.shift();
          answer = tempAnswer[0];
        }
        this.intent = res.choices[0].text;
        if (answer.indexOf("$Data") != -1) {
          this.detectTypeEvent2();
          
        } else if (answer.indexOf("$Question") != -1) {
          this.intent = "Question";
          this.sendQuestion();
        } else if (answer.indexOf("$Take quiz") != -1) {
          this.intent = "Take quiz";
          this.message = '';
          this.initBot();
        }

        this.callingOpenai = false;
        Swal.close();
      }, (err) => {
        console.log(err);
        this.callingOpenai = false;
        Swal.close();
        this.toastr.error('', this.translate.instant("generics.error try again"));

      }));
  }

  detectTypeEvent() {
    Swal.fire({
      title: this.translate.instant("generics.Please wait"),
      showCancelButton: false,
      showConfirmButton: false,
      allowOutsideClick: false
    }).then((result) => {

    });
    var promDetectEvent = "Which of the following events do you think is related to the text? Choose one: \n 'allergy', 'disease', 'drug', 'symptom', 'treatment', 'gene', 'other'"
    //var promDetectEvent = "Which of the following events do you think is related to the text? Choose one: \n 'allergy', 'disease', 'drug', 'symptom', 'treatment', 'gene', 'other'. And give me only the text that I have given you, from where you have obtained that it is related, with the following format: $event $text"
    var detectEvent = { value: 'Given this text: '+this.tempInput + ' ' +promDetectEvent };
    this.subscription.add(this.openAiService.postOpenAi(detectEvent)
      .subscribe((res: any) => {
        console.log(res)
        let tempAnswer = res.choices[0].text;
        let answer = tempAnswer
        if (res.choices[0].text.indexOf("\n\n") == 0) {
          tempAnswer = res.choices[0].text.split("\n\n");
          tempAnswer.shift();
          answer = tempAnswer[0];
        } else if (res.choices[0].text.indexOf("\n") == 0) {
          tempAnswer = res.choices[0].text.split("\n");
          tempAnswer.shift();
          answer = tempAnswer[0];
        }
        //pon en minusculas
        //this.seizuresForm.value.type = answer.toLowerCase();
        this.seizuresForm.patchValue({
          type: answer.toLowerCase(), 
          // formControlName2: myValue2 (can be omitted)
        });
        console.log(answer)
        Swal.close();
        this.callingTextAnalytics = false;
      }, (err) => {
        console.log(err);
        Swal.close();
        this.callingTextAnalytics = false;
      }));
  }
    
  detectTypeEvent2() {
    var foundEvent = false;
    this.intent = "Data";
    this.message = '';
    this.callingTextAnalytics = true;
    var info = this.tempInput.replace(/\n/g, " ");
    var jsontestLangText = { "text": info };
    console.log(info)
    this.subscription.add(this.apiDx29ServerService.callTextAnalytics(jsontestLangText)
      .subscribe((res: any) => {
        console.log(res)
        var info2 = null;
        this.resTextAnalyticsSegments = res;
        for (let j = 0; j < this.resTextAnalyticsSegments.entities.length; j++) {
          var actualDrug = { name: '', value: '', link: '' };
          if (this.resTextAnalyticsSegments.entities[j].confidenceScore >= 0.95) {
            if (this.resTextAnalyticsSegments.entities[j].category == 'MedicationName') {
              actualDrug.name = this.resTextAnalyticsSegments.entities[j].text;

              if (this.resTextAnalyticsSegments.entities[j].dataSources != null) {
                var found = false;
                for (let k = 0; k < this.resTextAnalyticsSegments.entities[j].dataSources.length && !found; k++) {
                  if (this.resTextAnalyticsSegments.entities[j].dataSources[k].name == 'ATC') {
                    actualDrug.link = this.resTextAnalyticsSegments.entities[j].dataSources[k].entityId;
                    found = true;
                  }
                }
              }
              if (this.resTextAnalyticsSegments.entityRelations != null) {
                var found = false;
                for (let k = 0; k < this.resTextAnalyticsSegments.entityRelations.length && !found; k++) {
                  if (this.resTextAnalyticsSegments.entityRelations[k].roles[0].entity.text == actualDrug.name && this.resTextAnalyticsSegments.entityRelations[k].roles[0].entity.category == 'MedicationName' && this.resTextAnalyticsSegments.entityRelations[k].roles[1].entity.category == 'Dosage') {
                    actualDrug.value = this.resTextAnalyticsSegments.entityRelations[k].roles[1].entity.text;
                  }
                  if (this.resTextAnalyticsSegments.entityRelations[k].roles[1].entity.text == actualDrug.name && this.resTextAnalyticsSegments.entityRelations[k].roles[0].entity.category == 'Dosage' && this.resTextAnalyticsSegments.entityRelations[k].roles[1].entity.category == 'MedicationName') {
                    actualDrug.value = this.resTextAnalyticsSegments.entityRelations[k].roles[0].entity.text;
                  }
                }

              }
              info2 = { name: actualDrug.name, type: 'drug', subtype: '', date: null, notes: '', data: actualDrug };
              console.log(info2)
              this.updateForm(info2);
              foundEvent = true;
            }

            if (this.resTextAnalyticsSegments.entities[j].category == 'SymptomOrSign') {
              info2 = { name: this.resTextAnalyticsSegments.entities[j].text, type: 'symptom', subtype: '', date: null, notes: '', data: {} };
              this.updateForm(info2);
              foundEvent = true;
            }

            if (this.resTextAnalyticsSegments.entities[j].category == 'Diagnosis') {
              info2 = { name: this.resTextAnalyticsSegments.entities[j].text, type: 'disease', subtype: '', date: null, notes: '', data: {} };
              this.updateForm(info2);
              foundEvent = true;
            }

            if (this.resTextAnalyticsSegments.entities[j].category == 'TreatmentName') {
              info2 = { name: this.resTextAnalyticsSegments.entities[j].text, type: 'treatment', subtype: '', date: null, notes: '', data: {} };
              this.updateForm(info2);
              foundEvent = true;
            }

            if (this.resTextAnalyticsSegments.entities[j].category == 'Allergen') {
              info2 = { name: this.resTextAnalyticsSegments.entities[j].text, type: 'allergy', subtype: '', date: null, notes: '', data: {} };
              this.updateForm(info2);
              foundEvent = true;
            }

            if (this.resTextAnalyticsSegments.entities[j].category == 'GeneOrProtein') {
              info2 = { name: this.resTextAnalyticsSegments.entities[j].text, type: 'gene', subtype: '', date: null, notes: '', data: {} };
              this.updateForm(info2);
              foundEvent = true;
            }
          }
        }
        if(!foundEvent){
          this.detectTypeEvent();
        }else{
          
        }
        


      }, (err) => {
        console.log(err);
        this.detectTypeEvent();
        this.callingTextAnalytics = false;
      }));
  }

  updateForm(info){

    var textToExtract = info.name;

      var jsontestLangText = [{ "Text": textToExtract }]
      this.subscription.add(this.apiDx29ServerService.getTranslationInvert(this.detectedLang, jsontestLangText)
        .subscribe((res2: any) => {
          if (res2[0] != undefined) {
            if (res2[0].translations[0] != undefined) {
              info.name = res2[0].translations[0].text;
            }
          }

          this.seizuresForm.patchValue({
            type: info.type,
            subtype: info.subtype,
            name: info.name,
            dose: info.dose,
            date: info.date,
            notes: info.notes,
            data: info.data
          });
          this.callingTextAnalytics = false;
          
        }, (err) => {
          console.log(err);
          this.seizuresForm.patchValue({
            type: info.type,
            subtype: info.subtype,
            name: info.name,
            dose: info.dose,
            date: info.date,
            notes: info.notes,
            data: info.data
          });
          this.callingTextAnalytics = false;
        }));

    
  }
    



  sendQuestion() {
    if (!this.message) {
      return;
    }
    this.responseEntities = "";
    /*this.messages.push({
      text: this.message,
      isUser: true
    });*/

    this.callingOpenai = true;
    var years = this.ageFromDateOfBirthday(this.basicInfoPatient.birthDate);

    var promDrug0 = this.translate.instant("home.prom1", {
      value: years,
    });

    var promDrug = '';

    /*var gener = this.translate.instant("personalinfo.Male");
    if(this.basicInfoPatient.gender=='female'){
      gener = this.translate.instant("personalinfo.Female");
    }*/
    var gener = this.basicInfoPatient.gender;


    if (this.basicInfoPatient.gender == 'female' || this.basicInfoPatient.gender == 'male') {
      var promis = this.translate.instant("home.promis");
      promDrug += promis + gener + '. ';
    } else {
      promDrug += '. ';
    }

    var and = this.translate.instant("generics.and");
    if (this.patientInfo.patientAllergies.length > 0) {
      var promAllergies = this.translate.instant("home.promAllergies")
      for (var i = 0; i < this.patientInfo.patientAllergies.length; i++) {
        if (i == 0) {
          promDrug += promAllergies + this.patientInfo.patientAllergies[i].name;
          if (i == 0 && this.patientInfo.patientAllergies.length == 1) {
            promDrug += '. ';
          }
        } else if (i == this.patientInfo.patientAllergies.length - 1) {
          promDrug += and + this.patientInfo.patientAllergies[i].name + '.';
        } else {
          promDrug += ', ' + this.patientInfo.patientAllergies[i].name;
        }
      }
    }
    if (this.patientInfo.patientDiseases.length > 0) {
      var prompatienthave = this.translate.instant("home.patienthave")
      for (var i = 0; i < this.patientInfo.patientDiseases.length; i++) {
        const today = new Date().toISOString();
        var days = this.differenceInDays(today, this.patientInfo.patientDiseases[i].date);
        if (this.patientInfo.patientDiseases[i].date != null && days > 0) {
          var promdays = this.translate.instant("home.Since", {
            value: days,
          });
          if (i == 0) {
            promDrug += prompatienthave + this.patientInfo.patientDiseases[i].name + promdays;
            if (i == 0 && this.patientInfo.patientDiseases.length == 1) {
              promDrug += '. ';
            }
          } else if (i == this.patientInfo.patientDiseases.length - 1) {
            promDrug += and + this.patientInfo.patientDiseases[i].name + promdays + '.';
          } else {
            promDrug += ', ' + this.patientInfo.patientDiseases[i].name + promdays;
          }
        } else {
          if (i == 0) {
            promDrug += prompatienthave + this.patientInfo.patientDiseases[i].name;
            if (i == 0 && this.patientInfo.patientDiseases.length == 1) {
              promDrug += '. ';
            }
          } else if (i == this.patientInfo.patientDiseases.length - 1) {
            promDrug += and + this.patientInfo.patientDiseases[i].name + '.';
          } else {
            promDrug += ', ' + this.patientInfo.patientDiseases[i].name;
          }
        }


      }
      //promDrug += 'El paciente tiene ' + this.patientInfo.patientDiseases + '. ';
    }
    if (this.patientInfo.patientMedications.length > 0) {
      var prompatienttakes = this.translate.instant("home.patienttakes")
      for (var i = 0; i < this.patientInfo.patientMedications.length; i++) {
        const today = new Date().toISOString();
        var days = this.differenceInDays(today, this.patientInfo.patientMedications[i].date);
        if (this.patientInfo.patientMedications[i].date != null && days > 0) {
          if (i == 0) {
            var promdays = this.translate.instant("home.Since", {
              value: days,
            });
            promDrug += prompatienttakes + this.patientInfo.patientMedications[i].name + promdays;
            if (i == 0 && this.patientInfo.patientMedications.length == 1) {
              promDrug += '. ';
            }
          } else if (i == this.patientInfo.patientMedications.length - 1) {
            promDrug += and + this.patientInfo.patientMedications[i].name + promdays + '.';
          } else {
            promDrug += ', ' + this.patientInfo.patientMedications[i].name + promdays;
          }
        } else {
          if (i == 0) {
            promDrug += prompatienttakes + this.patientInfo.patientMedications[i].name;
            if (i == 0 && this.patientInfo.patientMedications.length == 1) {
              promDrug += '. ';
            }
          } else if (i == this.patientInfo.patientMedications.length - 1) {
            promDrug += and + this.patientInfo.patientMedications[i].name + '.';
          } else {
            promDrug += ', ' + this.patientInfo.patientMedications[i].name;
          }
        }

      }
      //promDrug += 'El paciente toma ' + this.patientInfo.patientMedications + '. ';
    }


    this.translateTextMsg(promDrug0, promDrug)
  }

  translateTextMsg(promDrug0, promDrug) {
    this.valueProm = { value: promDrug0 + promDrug + this.message };

    var testLangText = this.message.substr(0, 4000)
    if (testLangText.length > 0) {
      this.subscription.add(this.apiDx29ServerService.getDetectLanguage(testLangText)
        .subscribe((res: any) => {
          if (res[0].language != 'en') {
            this.detectedLang = res[0].language;
            //var info = [{ "Text": promDrug + this.message }]
            var info = [{ "Text": this.message }, { "Text": promDrug }]
            this.subscription.add(this.apiDx29ServerService.getTranslationDictionary(res[0].language, info)
              .subscribe((res2: any) => {
                var textToTA = this.message.replace(/\n/g, " ");
                if (res2[0] != undefined) {
                  if (res2[0].translations[0] != undefined) {
                    textToTA = res2[0].translations[0].text;
                  }
                }
                if (res2[1] != undefined) {
                  if (res2[1].translations[0] != undefined) {
                    promDrug = res2[1].translations[0].text;
                  }
                }
                this.valueProm = { value: promDrug0 + promDrug + ' ' + textToTA };
                this.continueSendQuestion(textToTA);
              }, (err) => {
                console.log(err);
                this.continueSendQuestion(this.message);
              }));
          } else {
            this.detectedLang = 'en';
            this.continueSendQuestion(this.message);
          }

        }, (err) => {
          console.log(err);
          this.toastr.error('', this.translate.instant("generics.error try again"));
        }));
    } else {
      this.continueSendQuestion(this.message);
    }

  }

  continueSendQuestion(msg) {
    let question = this.message;
    Swal.fire({
      title: this.translate.instant("generics.Please wait"),
      showCancelButton: false,
      showConfirmButton: false,
      allowOutsideClick: false
    }).then((result) => {

    });
    this.subscription.add(this.openAiService.postOpenAi(this.valueProm)
      .subscribe((res: any) => {
        console.log(res)
        let tempAnswer = res.choices[0].text;
        let answer = tempAnswer
        if (res.choices[0].text.indexOf("\n\n") == 0) {
          tempAnswer = res.choices[0].text.split("\n\n");
          tempAnswer.shift();
          answer = tempAnswer[0];
        } else if (res.choices[0].text.indexOf("\n") == 0) {
          tempAnswer = res.choices[0].text.split("\n");
          tempAnswer.shift();
          answer = tempAnswer[0];
        }
        this.getBackTranslations2(answer, msg);

        //this.extractEntities(msg);
        /*var body = question + '. ' + answer;
        this.translateText(body);*/
        this.callingOpenai = false;
        Swal.close();
      }, (err) => {
        console.log(err);
        this.callingOpenai = false;
        Swal.close();
        this.toastr.error('', this.translate.instant("generics.error try again"));

      }));

    this.message = '';
  }

  getBackTranslations2(text, msg) {
    return new Promise((resolve, reject) => {
      let parseChoices0 = text;
      //delete last comma with space if exists
      if (parseChoices0.slice(-2) == ', ') {
        parseChoices0 = parseChoices0.slice(0, -2);
      }

      //text analitycs english
      var textToExtract = msg + ' ' + parseChoices0;
      this.extractEntities(textToExtract);

      var jsontestLangText = [{ "Text": parseChoices0 }]
      this.subscription.add(this.apiDx29ServerService.getTranslationInvert(this.detectedLang, jsontestLangText)
        .subscribe((res2: any) => {
          if (res2[0] != undefined) {
            if (res2[0].translations[0] != undefined) {
              parseChoices0 = res2[0].translations[0].text;
            }
          }
          //text analitycs original
          /*var textToExtract = this.message+ ' ' +parseChoices0;
          this.extractEntities(textToExtract);*/
          this.messages.push({
            text: parseChoices0,
            isUser: false
          });
          resolve({ text: parseChoices0 });
        }, (err) => {
          console.log(err);
          this.messages.push({
            text: text,
            isUser: false
          });
          reject(err);
        }));
    });
  }

  translateText(text) {
    var testLangText = text.substr(0, 4000)
    if (testLangText.length > 0) {
      this.subscription.add(this.apiDx29ServerService.getDetectLanguage(testLangText)
        .subscribe((res: any) => {
          if (res[0].language != 'en') {
            this.detectedLang = res[0].language;
            var info = [{ "Text": text }]
            this.subscription.add(this.apiDx29ServerService.getTranslationDictionary(res[0].language, info)
              .subscribe((res2: any) => {
                var textToTA = text.replace(/\n/g, " ");
                if (res2[0] != undefined) {
                  if (res2[0].translations[0] != undefined) {
                    textToTA = res2[0].translations[0].text;
                  }
                }
                text = textToTA;
                this.extractEntities(text);
              }, (err) => {
                console.log(err);
                this.extractEntities(text);
              }));
          } else {
            this.detectedLang = 'en';
            this.extractEntities(text);
          }

        }, (err) => {
          console.log(err);
          this.toastr.error('', this.translate.instant("generics.error try again"));
          this.callingOpenai = false;
        }));
    } else {
      this.extractEntities(text);
    }
  }

  extractEntities(text) {
    this.callTextAnalitycs(text);
  }


  callTextAnalitycs(text) {
    this.callingTextAnalytics = true;
    var info = text.replace(/\n/g, " ");
    var jsontestLangText = { "text": info };
    this.subscription.add(this.apiDx29ServerService.callTextAnalytics(jsontestLangText)
      .subscribe((res: any) => {
        console.log(res)
        this.resTextAnalyticsSegments = res;
        for (let j = 0; j < this.resTextAnalyticsSegments.entities.length; j++) {
          var actualDrug = { name: '', value: '', link: '' };
          if (this.resTextAnalyticsSegments.entities[j].confidenceScore >= 0.95) {
            if (this.resTextAnalyticsSegments.entities[j].category == 'MedicationName') {
              actualDrug.name = this.resTextAnalyticsSegments.entities[j].text;

              if (this.resTextAnalyticsSegments.entities[j].dataSources != null) {
                var found = false;
                for (let k = 0; k < this.resTextAnalyticsSegments.entities[j].dataSources.length && !found; k++) {
                  if (this.resTextAnalyticsSegments.entities[j].dataSources[k].name == 'ATC') {
                    actualDrug.link = this.resTextAnalyticsSegments.entities[j].dataSources[k].entityId;
                    found = true;
                  }
                }
              }
              if (this.resTextAnalyticsSegments.entityRelations != null) {
                var found = false;
                for (let k = 0; k < this.resTextAnalyticsSegments.entityRelations.length && !found; k++) {
                  if (this.resTextAnalyticsSegments.entityRelations[k].roles[0].entity.text == actualDrug.name && this.resTextAnalyticsSegments.entityRelations[k].roles[0].entity.category == 'MedicationName' && this.resTextAnalyticsSegments.entityRelations[k].roles[1].entity.category == 'Dosage') {
                    actualDrug.value = this.resTextAnalyticsSegments.entityRelations[k].roles[1].entity.text;
                  }
                  if (this.resTextAnalyticsSegments.entityRelations[k].roles[1].entity.text == actualDrug.name && this.resTextAnalyticsSegments.entityRelations[k].roles[0].entity.category == 'Dosage' && this.resTextAnalyticsSegments.entityRelations[k].roles[1].entity.category == 'MedicationName') {
                    actualDrug.value = this.resTextAnalyticsSegments.entityRelations[k].roles[0].entity.text;
                  }
                }

              }
              if (!this.isOnEvents(actualDrug.name, 'drug')) {
                this.posibleEntities.push({ name: actualDrug.name, type: 'drug', subtype: '', date: null, notes: '', data: actualDrug })
              }

            }

            if (this.resTextAnalyticsSegments.entities[j].category == 'SymptomOrSign') {
              if (!this.isOnEvents(this.resTextAnalyticsSegments.entities[j].text, 'symptom')) {
                this.posibleEntities.push({ name: this.resTextAnalyticsSegments.entities[j].text, type: 'symptom', subtype: '', date: null, notes: '', data: {} })
              }
            }

            if (this.resTextAnalyticsSegments.entities[j].category == 'Diagnosis') {
              if (!this.isOnEvents(this.resTextAnalyticsSegments.entities[j].text, 'disease') && this.resTextAnalyticsSegments.entities[j].dataSources.length > 0) {
                this.posibleEntities.push({ name: this.resTextAnalyticsSegments.entities[j].text, type: 'disease', subtype: '', date: null, notes: '', data: {} })
              }

            }

            if (this.resTextAnalyticsSegments.entities[j].category == 'TreatmentName') {
              if (!this.isOnEvents(this.resTextAnalyticsSegments.entities[j].text, 'treatment')) {
                this.posibleEntities.push({ name: this.resTextAnalyticsSegments.entities[j].text, type: 'treatment', subtype: '', date: null, notes: '', data: {} })
              }

            }

            if (this.resTextAnalyticsSegments.entities[j].category == 'Allergen') {
              if (!this.isOnEvents(this.resTextAnalyticsSegments.entities[j].text, 'allergy')) {
                this.posibleEntities.push({ name: this.resTextAnalyticsSegments.entities[j].text, type: 'allergy', subtype: '', date: null, notes: '', data: {} })
              }
            }

            if (this.resTextAnalyticsSegments.entities[j].category == 'GeneOrProtein') {
              if (!this.isOnEvents(this.resTextAnalyticsSegments.entities[j].text, 'gene')) {
                this.posibleEntities.push({ name: this.resTextAnalyticsSegments.entities[j].text, type: 'gene', subtype: '', date: null, notes: '', data: {} })
              }
            }
          }
        }

        var posibleEntitiescopy = JSON.parse(JSON.stringify(this.posibleEntities));
        console.log(posibleEntitiescopy)
        //trnaslate invert

        if (this.detectedLang != 'en') {
          var segments = [];
          for (let j = 0; j < this.posibleEntities.length; j++) {
            segments.push({ "text": this.posibleEntities[j].name });
          }

          this.subscription.add(this.apiDx29ServerService.getTranslationSegmentsInvert(this.detectedLang, segments)
            .subscribe((res2: any) => {
              console.log(res2)
              console.log(segments)
              for (var i = 0; i < segments.length; i++) {
                if (res2[i] != undefined) {
                  if (res2[i].translations[0] != undefined) {
                    //if las character is a dot, remove it
                    if (res2[i].translations[0].text.charAt(res2[i].translations[0].text.length - 1) == '.') {
                      res2[i].translations[0].text = res2[i].translations[0].text.substring(0, res2[i].translations[0].text.length - 1);
                    }
                    segments[i].text = res2[i].translations[0].text;
                    this.posibleEntities[i].name = segments[i].text;
                    if (this.isSavedEvent(this.posibleEntities[i].name, this.posibleEntities[i].type)) {
                      this.posibleEntities[i].delete = true;
                    }
                  }
                }
              }
              for (var i = 0; i < this.posibleEntities.length; i++) {
                if (this.posibleEntities[i].delete) {
                  this.posibleEntities.splice(i, 1);
                }
              }
              console.log(this.posibleEntities)
              this.currentEntity = this.posibleEntities[this.currentIndex];
              this.callingTextAnalytics = false;
            }, (err) => {
              console.log(err);
              this.currentEntity = this.posibleEntities[this.currentIndex];
              this.callingTextAnalytics = false;
            }));
        }


      }, (err) => {
        console.log(err);
        this.callingTextAnalytics = false;
      }));
  }


  isOnEvents(eventName, type) {
    var found = false;
    if (eventName.charAt(eventName.length - 1) == '.') {
      eventName = eventName.substring(0, eventName.length - 1);
    }
    for (let i = 0; i < this.events.length; i++) {
      if (this.events[i].name == eventName && this.events[i].type == type) {
        found = true;
      }
    }
    for (let j = 0; j < this.posibleEntities.length; j++) {
      if (this.posibleEntities[j].name == eventName && this.posibleEntities[j].type == type) {
        found = true;
      }
    }
    if (found) {
      return true;
    } else {
      return false;
    }
  }

  isSavedEvent(eventName, type) {
    var found = false;
    if (eventName.charAt(eventName.length - 1) == '.') {
      eventName = eventName.substring(0, eventName.length - 1);
    }
    for (let i = 0; i < this.events.length; i++) {
      if (this.events[i].name == eventName && this.events[i].type == type) {
        found = true;
      }
    }
    if (found) {
      return true;
    } else {
      return false;
    }
  }

  getBackTranslations(text, type) {
    return new Promise((resolve, reject) => {
      let parseChoices0 = text;
      //delete last comma with space if exists
      if (parseChoices0.slice(-2) == ', ') {
        parseChoices0 = parseChoices0.slice(0, -2);
      }

      var jsontestLangText = [{ "Text": parseChoices0 }]
      this.subscription.add(this.apiDx29ServerService.getTranslationInvert(this.detectedLang, jsontestLangText)
        .subscribe((res2: any) => {
          if (res2[0] != undefined) {
            if (res2[0].translations[0] != undefined) {
              parseChoices0 = res2[0].translations[0].text;
            }
          }
          resolve({ type: type, text: parseChoices0 });
        }, (err) => {
          console.log(err);
          reject(err);
        }));
    });
  }


  closeDateEntity(eventData: any, index: any, dp?: any) {
    this.posibleEntities[index].date = eventData;
    dp.close();
  }

  addEntity(index) {
    var info = { name: this.posibleEntities[index].name, type: this.posibleEntities[index].type, subtype: this.posibleEntities[index].subtype, date: this.posibleEntities[index].date, notes: this.posibleEntities[index].notes, data: this.posibleEntities[index].data };
    this.subscription.add(this.http.post(environment.api + '/api/events/' + this.authService.getCurrentPatient().sub, info)
      .subscribe((res: any) => {
        this.events.push(info);
        this.posibleEntities.splice(index, 1);
        this.currentEntity = this.posibleEntities[this.currentIndex];
        setTimeout(() => {
          this.startAnimation('fadeIn');
        }, 200);
      }, (err) => {
        console.log(err);
      }));
  }

  removeEntity(index) {
    console.log(index)
    this.posibleEntities.splice(index, 1);
    this.currentEntity = this.posibleEntities[this.currentIndex];
    setTimeout(() => {
      this.startAnimation('fadeIn');
    }, 200);
  }

  @HostListener('pan', ['$event'])
  onPan(event: any) {
    const x = event.deltaX;
    const y = event.deltaY;

    if (x > this._threshold) {
      this._el.nativeElement.style.transform = `translateX(${x}px) rotate(30deg)`;
      this._el.nativeElement.style.background = `#b3ffb361`;
      this._el.nativeElement.style.border = `7px solid #dee2e6`;
    } else if (x < -this._threshold) {
      this._el.nativeElement.style.transform = `translateX(${x}px) rotate(-30deg)`;
      this._el.nativeElement.style.background = `#ffb3b361`;
      this._el.nativeElement.style.border = `7px solid #dee2e6`;
    } else {
      this._el.nativeElement.style.transform = `translateX(${x}px)`;
      this._el.nativeElement.style.background = '';
      this._el.nativeElement.style.border = '';
    }
  }

  @HostListener('panend', ['$event'])
  onPanEnd(event: any) {
    this._el.nativeElement.style.transform = '';
    this._el.nativeElement.style.background = '';
    this._el.nativeElement.style.border = '';

    this.swipeDirection = event.deltaX > 30 ? 'right' : 'left';
    setTimeout(() => {
      if (this.swipeDirection === 'left' && (event.deltaX < -this._threshold)) {
        this.startAnimation('slideOutRight')
        this.removeEntity(this.currentIndex);
        //this.discardEntity();
      } else if (this.swipeDirection === 'right' && (event.deltaX > this._threshold)) {
        //this.saveEntity();
        this.startAnimation('slideOutLeft')
        this.addEntity(this.currentIndex);
      }
    }, 200);
  }

  onSwipe(event) {
    console.log(event)
    this.swipeDirection = event.deltaX > 0 ? 'right' : 'left';
    setTimeout(() => {
      if (this.swipeDirection === 'left') {
        this.removeEntity(this.currentIndex);
        //this.discardEntity();
      } else if (this.swipeDirection === 'right') {
        //this.saveEntity();
        this.addEntity(this.currentIndex);
      }
    }, 200);
  }

  discardEntity() {
    this.currentIndex++;
    this.swipeDirection = null;
    if (this.currentIndex >= this.posibleEntities.length) {
      this.currentEntity = null;
    } else {
      this.currentEntity = this.posibleEntities[this.currentIndex];
    }
  }

  saveEntity() {
    // Aquí puedes guardar la entidad actual
    this.discardEntity();
  }


  initBot() {
    this.restartBot = false;
    var paramssend = { userName: 'Javi', userId: this.authService.getIdUser(), token: this.authService.getToken(), lang: this.lang }; //http://healthbotcontainersamplef666.scm.azurewebsites.net:80/chatBot
    this.subscription.add(this.http.get('https://healthbot2.azurewebsites.net:443/chatBot', { params: paramssend })
      .subscribe((res: any) => {
        console.log(res)
        this.initBotConversation(res);
      }, (err) => {
        console.log(err);
      }));
  }

  getUserLocation(callback) {
    navigator.geolocation.getCurrentPosition(
      function (position) {
        var latitude = position.coords.latitude;
        var longitude = position.coords.longitude;
        var location = {
          lat: latitude,
          long: longitude
        }
        callback(location);
      },
      function (error) {
        // user declined to share location
        console.log("location error:" + error.message);
        callback();
      });
  }

  initBotConversation(token) {
    if (this.status >= 400) {
      alert(this.statusText);
      return;
    }
    try {
      // extract the data from the JWT
      const jsonWebToken = token;
      const tokenPayload = JSON.parse(atob(jsonWebToken.split('.')[1]));
      console.log(tokenPayload)
      const user = {
        id: tokenPayload.userId,
        name: tokenPayload.userName,
        lang: tokenPayload.lang
      };
      let domain = undefined;
      if (tokenPayload.directLineURI) {
        domain = "https://" + tokenPayload.directLineURI + "/v3/directline";
      }
      let location = undefined;
      if (tokenPayload.location) {
        location = tokenPayload.location;
      } else {
        // set default location if desired
        /*location = {
            lat: 44.86448450671394,
            long: -93.32597021107624
        }*/
      }
      var botConnection = window.WebChat.createDirectLine({
        token: tokenPayload.connectorToken,
        domain: domain
      });

      const store = window.WebChat.createStore({}, function (store) {
        return function (next) {
          return function (action) {
            console.log(action)
            if (action.type === 'DIRECT_LINE/CONNECT_FULFILLED') {
              store.dispatch({
                type: 'DIRECT_LINE/POST_ACTIVITY',
                meta: { method: 'keyboard' },
                payload: {
                  activity: {
                    type: "invoke",
                    name: "InitConversation",
                    locale: user.lang,
                    value: {
                      // must use for authenticated conversation.
                      jsonWebToken: jsonWebToken,

                      // Use the following activity to proactively invoke a bot scenario

                      triggeredScenario: {
                        trigger: "RAND_SF36_bot",
                        args: {
                          location: location,
                          myVar1: "{custom_arg_1}",
                          myVar2: "{custom_arg_2}"
                        }
                      }

                    }
                  }
                }
              });

            }
            else if (action.type === 'DIRECT_LINE/INCOMING_ACTIVITY') {
              if (action.payload && action.payload.activity && action.payload.activity.type === "event" && action.payload.activity.name === "ShareLocationEvent") {
                // share
                this.getUserLocation(function (location) {
                  store.dispatch({
                    type: 'WEB_CHAT/SEND_POST_BACK',
                    payload: { value: JSON.stringify(location) }
                  });
                });
              }

              if (action.payload && action.payload.activity.type === "event" && action.payload.activity.name === "gpt") {
                console.log(action.payload.activity)
                this.callgpt = true;
              }
              if (action.payload && action.payload.activity && action.payload.activity.type === "message" && action.payload.activity.label === "conversationTimeout") {
                this.restartBot = true;

              }

              document.getElementById('footchat').scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else if (action.type === 'DIRECT_LINE/DISCONNECT_FULFILLED') {
              //this.restartBot = true;
            }
            if (!this.callgpt) {
              if (this.restartBot) {
                this.initBot();
              } else {
                return next(action);
              }
            } else {
              console.log(action)
              this.callgpt = false;

              this.callGPT(action.payload.activity.value, function (tempAnswer) {
                store.dispatch({
                  type: 'DIRECT_LINE/POST_ACTIVITY',
                  meta: { method: 'keyboard' },
                  payload: {
                    activity: {
                      type: "invoke",
                      name: "InitConversation",
                      locale: user.lang,
                      value: {
                        // must use for authenticated conversation.
                        jsonWebToken: jsonWebToken,

                        // Use the following activity to proactively invoke a bot scenario

                        triggeredScenario: {
                          trigger: "gptScenario",
                          args: {
                            myVar1: tempAnswer
                          }
                        }

                      }
                    }
                  }
                });
              });


            }

          }.bind(this)
        }.bind(this)
      }.bind(this));

      const styleOptions = {
        botAvatarImage: 'assets/img/logo.png',
        botAvatarBackgroundColor: 'white',
        //userAvatarBackgroundColor: 'red',
        // botAvatarInitials: '',
        // userAvatarImage: '',
        hideSendBox: false, /* set to true to hide the send box from the view */
        botAvatarInitials: '',
        userAvatarInitials: 'You',
        backgroundColor: '#F8F8F8',
        hideUploadButton: true

      };

      const webchatOptions = {
        directLine: botConnection,
        styleOptions: styleOptions,
        store: store,
        userID: user.id,
        username: user.name,
        locale: user.lang
      };
      this.startChat(user, webchatOptions);
    } catch (error) {
      console.log(error)
    }

  }

  callGPT(msg, callback) {
    this.valueProm = { value: msg };
    this.subscription.add(this.openAiService.postOpenAi(this.valueProm)
      .subscribe((res: any) => {
        console.log(res)
        let tempAnswer = res.choices[0].text;
        let answer = tempAnswer
        if (res.choices[0].text.indexOf("\n\n") == 0) {
          tempAnswer = res.choices[0].text.split("\n\n");
          tempAnswer.shift();
          answer = tempAnswer[0];
        } else if (res.choices[0].text.indexOf("\n") == 0) {
          tempAnswer = res.choices[0].text.split("\n");
          tempAnswer.shift();
          answer = tempAnswer[0];
        }

        this.callingOpenai = false;
        callback(tempAnswer);
      }, (err) => {
        console.log(err);
        this.callingOpenai = false;
        this.toastr.error('', this.translate.instant("generics.error try again"));

      }));
  }

  startChat(user, webchatOptions) {
    const botContainer = document.getElementById('webchat');
    window.WebChat.renderWebChat(webchatOptions, botContainer);
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
          this.seizuresForm.reset();
          this.intent = '';
          this.submitted = false;
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

  back(){
    this.seizuresForm.reset();
    this.intent = '';
  }

}
