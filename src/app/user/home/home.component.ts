import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
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

  loadedEvents: boolean = false;

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
          this.initBot();
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
                this.initBot();
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
    this.initBot();
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
                        trigger: "initScenario",
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
            }
            if (!this.callgpt) {
              if(this.restartBot){
                this.initBot();
              }else{
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

}
