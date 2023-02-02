import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { animate, style, transition, trigger } from '@angular/animations';
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

import { OpenAiService } from 'app/shared/services/openAi.service';


@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  animations: [
    trigger('fadeSlideInOut', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate('500ms', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
      transition(':leave', [
        animate('500ms', style({ opacity: 0, transform: 'translateY(10px)' })),
      ]),
    ])
  ],
  providers: [PatientService, OpenAiService]
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
  //posibleEntities = [];
  posibleEntities = [
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
];
  loadedEvents: boolean = false;
  loadingPosibleEntities: boolean = false;

  constructor(private http: HttpClient, public translate: TranslateService, private authService: AuthService, private patientService: PatientService, public searchFilterPipe: SearchFilterPipe, public toastr: ToastrService, private dateService: DateService, private sortService: SortService, private adapter: DateAdapter<any>, private searchService: SearchService, private router: Router, public trackEventsService: TrackEventsService, private openAiService: OpenAiService) {
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

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }


  ngOnInit() {
    this.initEnvironment();

    this.initChat()
  }

  initChat() {
    this.messages.push({
      text: 'Hello, I am your virtual assistant. How can I help you?',
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
    var promDrug = 'Compórtate como un médico. El paciente tiene ' + years + ' años y es ' + this.basicInfoPatient.gender + '. ';

    if (this.patientInfo.patientAllergies.length > 0) {
      for (var i = 0; i < this.patientInfo.patientAllergies.length; i++) {
        if (i == 0) {
          promDrug += 'El paciente tiene alergia a ' + this.patientInfo.patientAllergies[i].name;
          if (i == 0 && this.patientInfo.patientAllergies.length == 1) {
            promDrug += '. ';
          }
        } else if (i == this.patientInfo.patientAllergies.length - 1) {
          promDrug += ' y ' + this.patientInfo.patientAllergies[i].name + '.';
        } else {
          promDrug += ', ' + this.patientInfo.patientAllergies[i].name;
        }
      }
    }
    if (this.patientInfo.patientDiseases.length > 0) {
      for (var i = 0; i < this.patientInfo.patientDiseases.length; i++) {
        if (i == 0) {
          promDrug += 'El paciente tiene ' + this.patientInfo.patientDiseases[i].name + ' desde ' + this.patientInfo.patientDiseases[i].date;
          if (i == 0 && this.patientInfo.patientDiseases.length == 1) {
            promDrug += '. ';
          }
        } else if (i == this.patientInfo.patientDiseases.length - 1) {
          promDrug += ' y ' + this.patientInfo.patientDiseases[i].name + ' desde ' + this.patientInfo.patientDiseases[i].date + '.';
        } else {
          promDrug += ', ' + this.patientInfo.patientDiseases[i].name + ' desde ' + this.patientInfo.patientDiseases[i].date;
        }
      }
      //promDrug += 'El paciente tiene ' + this.patientInfo.patientDiseases + '. ';
    }
    if (this.patientInfo.patientMedications.length > 0) {
      for (var i = 0; i < this.patientInfo.patientMedications.length; i++) {
        if (i == 0) {
          promDrug += 'El paciente toma ' + this.patientInfo.patientMedications[i].name + ' desde ' + this.patientInfo.patientMedications[i].date;
          if (i == 0 && this.patientInfo.patientMedications.length == 1) {
            promDrug += '. ';
          }
        } else if (i == this.patientInfo.patientMedications.length - 1) {
          promDrug += ' y ' + this.patientInfo.patientMedications[i].name + ' desde ' + this.patientInfo.patientMedications[i].date + '.';
        } else {
          promDrug += ', ' + this.patientInfo.patientMedications[i].name + ' desde ' + this.patientInfo.patientMedications[i].date;
        }
      }
      //promDrug += 'El paciente toma ' + this.patientInfo.patientMedications + '. ';
    }
    this.valueProm = { value: promDrug + this.message };
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
        this.messages.push({
          text: answer,
          isUser: false
        });
        console.log(question)
        console.log(answer)
        this.extractEntities(question, answer);
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

  extractEntities(question, answer) {
    this.loadingPosibleEntities = true;
    let promEntities = 'Compórtate como un médico. Clasifica en Síntomas, Medicación, Tratamientos, Alergias, y "Enfermedades o afecciones previas", todo lo que aparezca en el siguiente texto: ' + question + '. ' + answer + '. Si no hay ninguna, escribe "no" por cada una de las 5 secciónes. Si hay, devuelve una lista por cada seccion previa, separado por comas. Si no estás seguro, no lo incluyas.';
    console.log(promEntities)
    let prom = { value: promEntities + this.message };
    this.subscription.add(this.openAiService.postOpenAi(prom)
      .subscribe((res: any) => {
        this.loadingPosibleEntities = false;
        console.log(res)
        this.responseEntities = res.choices[0].text;
        const parsedResponse = this.openAiService.parseResponse(res.choices[0].text);
        console.log(parsedResponse);
        var tempPosibleEntities = this.openAiService.parseEntities(parsedResponse);
        for(var i = 0; i < tempPosibleEntities.length; i++){
            this.posibleEntities.push(tempPosibleEntities[i])
        }
      }, (err) => {
        console.log(err);
        this.loadingPosibleEntities = false;
      }));
  }


  closeDateEntity(eventData: any, index: any, dp?: any) {
    this.posibleEntities[index].date = eventData;
    dp.close();
  }

  addEntity(index) {
    var info = { name: this.posibleEntities[index].name, type: this.posibleEntities[index].type, date: this.posibleEntities[index].date, notes: this.posibleEntities[index].notes };
    this.subscription.add( this.http.post(environment.api+'/api/events/'+this.authService.getCurrentPatient().sub, info)
        .subscribe( (res : any) => {
          this.posibleEntities.splice(index, 1);
         }, (err) => {
           console.log(err);
         }));
  }

  removeEntity(index) {
    console.log(index)
    this.posibleEntities.splice(index, 1);
  }

}
