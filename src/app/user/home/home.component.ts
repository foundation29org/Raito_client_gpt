import { Component, OnInit, OnDestroy, HostListener, ElementRef, ViewChild  } from '@angular/core';
import { animate, keyframes, style, transition, trigger } from '@angular/animations';
import * as kf from './keyframes';
import { Router } from "@angular/router";
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from 'environments/environment';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from 'app/shared/auth/auth.service';
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
  /*posibleEntities = [
    {
      "name": "convulsiones",
      "type": "symptom",
      "date": null,
      "notes": ""
    },
    {
      "name": "retraso en el desarrollo",
      "type": "symptom",
      "date": null,
      "notes": ""
    },
    {
      "name": "problemas de comportamiento",
      "type": "symptom",
      "date": null,
      "notes": ""
    },
    {
      "name": "problemas de aprendizaje.",
      "type": "symptom",
      "date": null,
      "notes": ""
    },
    {
      "name": "hablar con el médico",
      "type": "treatment",
      "date": null,
      "notes": ""
    },
    {
      "name": "Dravet",
      "type": "disease",
      "date": null,
      "notes": ""
    }
  ];*/
  loadedEvents: boolean = false;
  loadingPosibleEntities: boolean = false;

  currentIndex = 0;
  currentEntity = this.posibleEntities[this.currentIndex];
  swipeDirection: 'left' | 'right' | null = null;
  animationState: string;
  private _threshold = 15;
  @ViewChild("panelcard") _el: ElementRef;
  detectedLang: string = 'en';

  constructor(private http: HttpClient, public translate: TranslateService, private authService: AuthService, private patientService: PatientService, public searchFilterPipe: SearchFilterPipe, public toastr: ToastrService, private dateService: DateService, private sortService: SortService, private adapter: DateAdapter<any>, private searchService: SearchService, private router: Router, public trackEventsService: TrackEventsService, private openAiService: OpenAiService, private apiDx29ServerService: ApiDx29ServerService) {
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
  }

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
    var years = this.ageFromDateOfBirthday(this.basicInfoPatient.birthDate);

    var promDrug = this.translate.instant("home.prom1", {
      value: years,
  });
  
    var gener = this.translate.instant("personalinfo.Male");
    if(this.basicInfoPatient.gender=='female'){
      gener = this.translate.instant("personalinfo.Female");
    }
    
    
    if(this.basicInfoPatient.gender=='female'|| this.basicInfoPatient.gender=='male'){
      var promis = this.translate.instant("home.promis");
      promDrug += promis + gener + '. ';
    }else{
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
        if(this.patientInfo.patientDiseases[i].date!=null && days>0){
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
        }else{
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
        if(this.patientInfo.patientMedications[i].date!=null && days>0){
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
        }else{
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
    

    this.translateTextMsg(promDrug)
  }

  translateTextMsg(promDrug){
    this.valueProm = { value: promDrug + this.message };

    var testLangText = this.message.substr(0, 4000)
    if (testLangText.length > 0) {
        this.subscription.add(this.apiDx29ServerService.getDetectLanguage(testLangText)
            .subscribe((res: any) => {
                if (res[0].language != 'en') {
                  this.detectedLang = res[0].language;
                    var info = [{ "Text": promDrug + this.message }]
                    this.subscription.add(this.apiDx29ServerService.getTranslationDictionary(res[0].language, info)
                        .subscribe((res2: any) => {
                            var textToTA = this.message.replace(/\n/g, " ");
                            if (res2[0] != undefined) {
                                if (res2[0].translations[0] != undefined) {
                                    textToTA = res2[0].translations[0].text;
                                }
                            }
                            this.valueProm = { value: textToTA };
                            this.continueSendMessage(textToTA );
                        }, (err) => {
                            console.log(err);
                            this.continueSendMessage(this.message);
                        }));
                } else {
                  this.detectedLang = 'en';
                  this.continueSendMessage(this.message);
                }

            }, (err) => {
                console.log(err);
                this.toastr.error('', this.translate.instant("generics.error try again"));
            }));
    } else {
      this.continueSendMessage(this.message);
    }

  }

  continueSendMessage(msg) {
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
        this.getBackTranslations2(answer);
        
        this.extractEntities(msg);
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

  getBackTranslations2(text){
    return new Promise((resolve, reject) => {
      let parseChoices0 = text;
      //delete last comma with space if exists
      if(parseChoices0.slice(-2) == ', '){
        parseChoices0 = parseChoices0.slice(0, -2);
      }
      
      var jsontestLangText = [{ "Text": parseChoices0 }]
        this.subscription.add(this.apiDx29ServerService.getTranslationInvert(this.detectedLang,jsontestLangText)
        .subscribe( (res2 : any) => {
            if (res2[0] != undefined) {
                if (res2[0].translations[0] != undefined) {
                    parseChoices0 = res2[0].translations[0].text;
                }
            }
            this.messages.push({
              text: parseChoices0,
              isUser: false
            });
            resolve({ text: parseChoices0});
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

  translateText(text){
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
    this.loadingPosibleEntities = true;

    var promEntities = this.translate.instant("home.promentities", {
      value: text,
    });

    console.log(promEntities)
    let prom = { value: promEntities + this.message };
    this.subscription.add(this.openAiService.postOpenAi(prom)
      .subscribe((res: any) => {
        this.loadingPosibleEntities = false;
        console.log(res)
        this.responseEntities = res.choices[0].text;
        const parsedResponse = this.openAiService.parseResponse(res.choices[0].text);
        console.log(parsedResponse);
        //translate back
        if(this.detectedLang!='en'){
          this.translateBack(parsedResponse);
        }else{
          this.continueExtractEntities(parsedResponse);
        }
        
      }, (err) => {
        console.log(err);
        this.loadingPosibleEntities = false;
      }));
  }

  translateBack(parsedResponse){
    let chunkPromises = [];
    if(parsedResponse['symtoms'].length>0){
      var tempText = '';
      for(let i=0; i<parsedResponse['symtoms'].length; i++){
        if(parsedResponse['symtoms'][i]!='no' && parsedResponse['symtoms'][i]!='No'){
          tempText += parsedResponse['symtoms'][i] + ', ';
        }
      }
      chunkPromises.push(this.getBackTranslations(tempText, 'symtoms'));
    }
    if(parsedResponse['drugs'].length>0){
      var tempText = '';
      for(let i=0; i<parsedResponse['drugs'].length; i++){
        if(parsedResponse['drugs'][i]!='no' && parsedResponse['drugs'][i]!='No'){
          tempText += parsedResponse['drugs'][i] + ', ';
        }
      }
      chunkPromises.push(this.getBackTranslations(tempText, 'drugs'));
    }
    if(parsedResponse['treatments'].length>0){
      var tempText = '';
      for(let i=0; i<parsedResponse['treatments'].length; i++){
        if(parsedResponse['treatments'][i]!='no' && parsedResponse['treatments'][i]!='No'){
          tempText += parsedResponse['treatments'][i] + ', ';
        }
      }
      chunkPromises.push(this.getBackTranslations(tempText, 'treatments'));
    }
    if(parsedResponse['diseases'].length>0){
      var tempText = '';
      for(let i=0; i<parsedResponse['diseases'].length; i++){
        if(parsedResponse['diseases'][i]!='no' && parsedResponse['diseases'][i]!='No'){
          tempText += parsedResponse['diseases'][i] + ', ';
        }
      }
      chunkPromises.push(this.getBackTranslations(tempText, 'diseases'));
    }
    if(parsedResponse['allergy'].length>0){
      var tempText = '';
      for(let i=0; i<parsedResponse['allergy'].length; i++){
        if(parsedResponse['allergy'][i]!='no' && parsedResponse['allergy'][i]!='No'){
          tempText += parsedResponse['allergy'][i] + ', ';
        }
      }
      chunkPromises.push(this.getBackTranslations(tempText, 'allergy'));
    }
  
    Promise.all(chunkPromises).then((data) => {
      console.log("Todas las llamadas a getEntities han terminado");
      console.log(data)
      for(let i=0; i<data.length; i++){
        if(data[i].type=='symtoms'){
          parsedResponse['symtoms'] = data[i].text.split(', ');
        }
        if(data[i].type=='drugs'){
          parsedResponse['drugs'] = data[i].text.split(', ');
        }
        if(data[i].type=='treatments'){
          parsedResponse['treatments'] = data[i].text.split(', ');
        }
        if(data[i].type=='diseases'){
          parsedResponse['diseases'] = data[i].text.split(', ');
        }
        if(data[i].type=='allergy'){
          parsedResponse['allergy'] = data[i].text.split(', ');
        }
      }
      this.continueExtractEntities(parsedResponse);
    });
  }

  getBackTranslations(text, type){
      return new Promise((resolve, reject) => {
        let parseChoices0 = text;
        //delete last comma with space if exists
        if(parseChoices0.slice(-2) == ', '){
          parseChoices0 = parseChoices0.slice(0, -2);
        }
        
        var jsontestLangText = [{ "Text": parseChoices0 }]
          this.subscription.add(this.apiDx29ServerService.getTranslationInvert(this.detectedLang,jsontestLangText)
          .subscribe( (res2 : any) => {
              if (res2[0] != undefined) {
                  if (res2[0].translations[0] != undefined) {
                      parseChoices0 = res2[0].translations[0].text;
                  }
              }
              resolve({type: type, text: parseChoices0});
          }, (err) => {
            console.log(err);
            reject(err);
          }));
      });
    }
  

  continueExtractEntities(parsedResponse) {
    var tempPosibleEntities = this.openAiService.parseEntities(parsedResponse);
    for (var i = 0; i < tempPosibleEntities.length; i++) {
      this.posibleEntities.push(tempPosibleEntities[i])
    }
    this.currentEntity = this.posibleEntities[this.currentIndex];
  }


  closeDateEntity(eventData: any, index: any, dp?: any) {
    this.posibleEntities[index].date = eventData;
    dp.close();
  }

  addEntity(index) {
    var info = { name: this.posibleEntities[index].name, type: this.posibleEntities[index].type, date: this.posibleEntities[index].date, notes: this.posibleEntities[index].notes };
    this.subscription.add(this.http.post(environment.api + '/api/events/' + this.authService.getCurrentPatient().sub, info)
      .subscribe((res: any) => {
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
      this._el.nativeElement.style.border= `7px solid #dee2e6`;
    } else if (x < -this._threshold) {
      this._el.nativeElement.style.transform = `translateX(${x}px) rotate(-30deg)`;
      this._el.nativeElement.style.background = `#ffb3b361`;
      this._el.nativeElement.style.border= `7px solid #dee2e6`;
    } else {
      this._el.nativeElement.style.transform = `translateX(${x}px)`;
      this._el.nativeElement.style.background = '';
      this._el.nativeElement.style.border= '';
    }
  }

  @HostListener('panend', ['$event'])
  onPanEnd(event: any) {
    this._el.nativeElement.style.transform = '';
    this._el.nativeElement.style.background = '';
    this._el.nativeElement.style.border= '';

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

}
