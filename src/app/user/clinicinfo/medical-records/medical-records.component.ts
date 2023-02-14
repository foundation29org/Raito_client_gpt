import { Component, OnInit, LOCALE_ID, OnDestroy, HostListener, ElementRef, ViewChild } from '@angular/core';
import { animate, keyframes, style, transition, trigger } from '@angular/animations';
import * as kf from '../../home/keyframes';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from 'environments/environment';
import { AuthGuard } from 'app/shared/auth/auth-guard.service';
import { TranslateService } from '@ngx-translate/core';
import { NgbModal, NgbModalRef, NgbModalOptions } from '@ng-bootstrap/ng-bootstrap';

import { Subscription } from 'rxjs/Subscription';
import { BlobStorageService, IBlobAccessToken } from 'app/shared/services/blob-storage.service';
import { AuthService } from 'app/shared/auth/auth.service';
import { PatientService } from 'app/shared/services/patient.service';
import { ApiDx29ServerService } from 'app/shared/services/api-dx29-server.service';
import { Apif29BioService } from 'app/shared/services/api-f29bio.service';
import { SearchService } from 'app/shared/services/search.service';
import { SortService } from 'app/shared/services/sort.service';
import { DateService } from 'app/shared/services/date.service';
import { HighlightSearch } from 'app/shared/services/search-filter-highlight.service';
import { CordovaService } from 'app/shared/services/cordova.service';
import { OpenAiService } from 'app/shared/services/openAi.service';
import 'hammerjs';

import Swal from 'sweetalert2';
import { ToastrService } from 'ngx-toastr';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/of';
import 'rxjs/add/operator/toPromise';

export function getCulture() {
  return sessionStorage.getItem('culture');
}

declare var JSZipUtils: any;
declare var Docxgen: any;

@Component({
  selector: 'app-medical-records',
  templateUrl: './medical-records.component.html',
  styleUrls: ['./medical-records.component.scss'],
  animations: [
    trigger('fadeSlideInOut', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate('200ms', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
      transition(':leave', [
        animate('200ms', style({ opacity: 0, transform: 'translateY(10px)' })),
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
  providers: [PatientService, ApiDx29ServerService, { provide: LOCALE_ID, useFactory: getCulture }, Apif29BioService, OpenAiService]
})
export class MedicalRecordsComponent implements OnInit, OnDestroy {

  private subscription: Subscription = new Subscription();
  preparingFile: boolean = false;
  preparingFileEmergency: boolean = false;
  uploadingGenotype: boolean = false;
  uploadingEmergency: boolean = false;
  accessToken: IBlobAccessToken = {
    // tslint:disable-next-line:max-line-length
    sasToken: environment.blobAccessToken.sasToken,
    blobAccountUrl: environment.blobAccessToken.blobAccountUrl,
    containerName: '',
    patientId: ''
  };

  otherGeneFiles: any = [];
  emergencyFiles: any = [];
  filesNcr: any = [];
  loadedGeno: boolean = false;
  userId: string = '';
  loadedPatientId: boolean = false;
  selectedPatient: any = {};
  uploadProgress: Observable<number>;
  uploadProgress2: Observable<number>;
  langDetected: string = '';
  lang: string = 'en';
  resTextAnalyticsSegments: any;
  temporalSymptoms: any = [];
  resultTextNcr: string = '';
  resultTextNcrCopy: string = '';
  step: string = '0';
  ncrResultView: boolean = false;
  selectedInfoSymptomIndex: number = -1;
  modalReference: NgbModalRef;
  modalReference2: NgbModalRef;
  phenotype: any = {};
  phenotypeCopy: any = {};
  sendingSymptoms: boolean = false;
  private msgDataSavedFail: string;
  showButtonScroll: boolean = false;
  extractingData: boolean = false;
  callingTextAnalytics: boolean = false;
  nameTitle: string = '';
  submitted = false;
  saving: boolean = false;

  documentForm: FormGroup;
  dataFile: any = {};
  typedocument: string = '';

  loadedDocs: boolean = false;
  docs: any = [];
  actualDoc: any = {};
  simplename: string = '';
  isMobile: boolean = false;
  showTextAreaFlag: boolean = false;
  medicalText: string = '';
  posibleEntities = [];
  loadingPosibleEntities: boolean = false;

  currentIndex = 0;
  currentEntity = this.posibleEntities[this.currentIndex];
  swipeDirection: 'left' | 'right' | null = null;
  animationState: string;
  private _threshold = 15;
  @ViewChild("panelcard") _el: ElementRef;
  showingEntities: boolean = false;
  detectedLang: string = 'en';

  events = [];

  constructor(private http: HttpClient, private blob: BlobStorageService, private authService: AuthService, private patientService: PatientService, private apiDx29ServerService: ApiDx29ServerService, public translate: TranslateService, public toastr: ToastrService, private apif29BioService: Apif29BioService, private searchService: SearchService, private sortService: SortService, private modalService: NgbModal, private authGuard: AuthGuard, private highlightSearch: HighlightSearch, private formBuilder: FormBuilder, private dateService: DateService, public cordovaService: CordovaService, private openAiService: OpenAiService) {
    $.getScript("./assets/js/docs/jszip-utils.js").done(function (script, textStatus) {
      //console.log("finished loading and running jszip-utils.js. with a status of" + textStatus);
    });

    $.getScript("./assets/js/docs/docxtemplater.v2.1.5.js").done(function (script, textStatus) {
      //console.log("finished loading and running docxtemplater.js. with a status of" + textStatus);
    });

    this.lang = sessionStorage.getItem('lang');
    this.loadTranslations();
    this.isMobile = this.authService.getIsDevice();

  }

  loadTranslations() {
    this.translate.get('generics.Data saved fail').subscribe((res: string) => {
      this.msgDataSavedFail = res;
    });
  }

  ngOnInit(): void {
    if (this.isMobile) {
      this.cordovaService.checkPermissions();
    }
    this.initEnvironment();

    //si tiene VCF
    this.subscription.add(this.blob.changeFilesExomizerBlobVcf.subscribe(vcfFilesOnBlob => {
      if (vcfFilesOnBlob.length > 0) {
        var otherGeneFiles = [];
        var emergencyFiles = [];
        var filesNcr = [];
        for (var i = 0; i < vcfFilesOnBlob.length; i++) {
          if (vcfFilesOnBlob[i].name.indexOf('raitofile/') != -1) {
            var name = vcfFilesOnBlob[i].name.substr(vcfFilesOnBlob[i].name.lastIndexOf('/') + 1)
            vcfFilesOnBlob[i].simplename = name;
            var foundElementDrugIndex = this.searchService.searchIndex(this.docs, 'url', vcfFilesOnBlob[i].name);
            if (foundElementDrugIndex != -1) {
              vcfFilesOnBlob[i].simplename = this.docs[foundElementDrugIndex].name;
            }

            vcfFilesOnBlob[i].contentLength = this.formatBytes(vcfFilesOnBlob[i].contentLength);
            if ((vcfFilesOnBlob[i].name).indexOf('textanaresult.json') == -1) {
              if (vcfFilesOnBlob[i].name.indexOf('raitofile/emergency/') != -1) {
                emergencyFiles.push(vcfFilesOnBlob[i])
              } else {
                otherGeneFiles.push(vcfFilesOnBlob[i])
              }

            } else {
              filesNcr.push(vcfFilesOnBlob[i]);
            }

          }
        }
        this.emergencyFiles = emergencyFiles;
        this.otherGeneFiles = otherGeneFiles;
        this.filesNcr = filesNcr;
        this.testResultsAnalytics();
      } else {
        console.log('no tiene!');
      }
      this.loadedGeno = true;
    }));

    this.subscription.add(this.blob.changeNcrFilesPatientBlob.subscribe(filesNcr => {
      if (filesNcr.length > 0) {
        this.filesNcr = filesNcr;
        this.testResultsAnalytics();
      } else {
        console.log('no tiene ncr!');
        this.filesNcr = [];
      }
    }));

  }

  startAnimation(state) {
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

  testResultsAnalytics() {
    if (!this.isMobile) {
      for (var i = 0; i < this.otherGeneFiles.length; i++) {
        var enc = false;
        for (var j = 0; j < this.filesNcr.length && !enc; j++) {
          var urlorigin = this.otherGeneFiles[i].name.substr(0, this.otherGeneFiles[i].name.lastIndexOf('/') + 1)
          var urlncr = this.filesNcr[j].name.substr(0, this.filesNcr[j].name.lastIndexOf('/') + 1)
          if (urlorigin == urlncr) {
            this.otherGeneFiles[i].hasResults = true;
            enc = true;
          }
        }
        if (!this.otherGeneFiles[i].hasResults) {
          this.extractData(this.otherGeneFiles[i].name, this.otherGeneFiles[i].contentSettings.contentType);
        }

      }

      for (var i = 0; i < this.emergencyFiles.length; i++) {
        var enc = false;
        for (var j = 0; j < this.filesNcr.length && !enc; j++) {
          var urlorigin = this.emergencyFiles[i].name.substr(0, this.emergencyFiles[i].name.lastIndexOf('/') + 1)
          var urlncr = this.filesNcr[j].name.substr(0, this.filesNcr[j].name.lastIndexOf('/') + 1)
          if (urlorigin == urlncr) {
            this.emergencyFiles[i].hasResults = true;
            enc = true;
          }
        }
        if (!this.emergencyFiles[i].hasResults) {
          this.extractData(this.emergencyFiles[i].name, this.emergencyFiles[i].contentSettings.contentType);
        }
      }
    }

  }

  formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  initEnvironment() {
    this.userId = this.authService.getIdUser();
    if (this.authService.getCurrentPatient() == null) {
      this.loadPatientId();
    } else {
      this.loadedPatientId = true;
      this.selectedPatient = this.authService.getCurrentPatient();
      this.getAzureBlobSasToken();
    }
  }

  loadPatientId() {
    this.loadedPatientId = false;
    this.subscription.add(this.patientService.getPatientId()
      .subscribe((res: any) => {
        this.loadedPatientId = true;
        this.authService.setCurrentPatient(res);
        this.selectedPatient = res;
        this.getAzureBlobSasToken();
      }, (err) => {
        console.log(err);
      }));
  }

  getAzureBlobSasToken() {
    this.loadEvents();
    this.getDocs();
    this.loadSymptoms();
    this.accessToken.containerName = this.authService.getCurrentPatient().sub.substr(1);
    this.accessToken.patientId = this.authService.getCurrentPatient().sub;

    this.subscription.add(this.apiDx29ServerService.getAzureBlobSasToken(this.accessToken.containerName)
      .subscribe((res: any) => {
        this.accessToken.sasToken = '?' + res;
        this.blob.init(this.accessToken);
        this.blob.createContainerIfNotExists(this.accessToken, 'patientGenoFiles');
      }, (err) => {
        console.log(err);
      }));

    this.loadedGeno = false;
  }

  loadEvents() {

    this.subscription.add(this.http.get(environment.api + '/api/events/' + this.authService.getCurrentPatient().sub)
      .subscribe((res: any) => {
        if (res.message) {
          //no tiene información
        } else {
          if (res.length > 0) {
            res.sort(this.sortService.DateSort("dateInput"));
            this.events = res;
          }
        }
      }, (err) => {
        console.log(err);
      }));
  }

  loadSymptoms() {
    var para = this.authService.getCurrentPatient();
    //cargar el fenotipo del usuario
    this.subscription.add(this.apiDx29ServerService.getSymptoms(para.sub)
      .subscribe((res: any) => {
        if (res.message) {
          //no tiene fenotipo
        } else {
          if (res.phenotype.data.length > 0) {
            res.phenotype.data.sort(this.sortService.GetSortOrder("name"));
            this.phenotype = res.phenotype;
            this.phenotypeCopy = JSON.parse(JSON.stringify(res.phenotype));
          } else {
            //no tiene fenotipo
            this.phenotype = res.phenotype;
            this.phenotypeCopy = JSON.parse(JSON.stringify(res.phenotype));
          }
        }
      }, (err) => {
        console.log(err);
      }));
  }

  onFileChangeStep1(event) {
    this.preparingFile = true;
    if (event.target.files && event.target.files[0]) {
      var reader = new FileReader();
      reader.readAsDataURL(event.target.files[0]); // read file as data url
      reader.onload = (event2: any) => { // called once readAsDataURL is completed
        this.preparingFile = false;
        var filename = event.target.files[0].name;
        var extension = filename.substr(filename.lastIndexOf('.'));
        var pos = (filename).lastIndexOf('.')
        pos = pos - 4;
        if (pos > 0 && extension == '.gz') {
          extension = (filename).substr(pos);
        }
        filename = filename.split(extension)[0];
        //event.target.response.content
        if (extension == '.jpg' || extension == '.png' || extension == '.gif' || extension == '.tiff' || extension == '.tif' || extension == '.bmp' || extension == '.dib' || extension == '.bpg' || extension == '.psd' || extension == '.jpeg' || extension == '.jpe' || extension == '.jfif' || event.target.files[0].type == 'application/pdf' || extension == '.docx' || event.target.files[0].type == 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
          var uniqueFileName = this.getUniqueFileName();
          if (this.typedocument == 'general') {
            filename = 'raitofile/' + uniqueFileName + '/' + filename + extension;
          } else {
            filename = 'raitofile/emergency/' + uniqueFileName + '/' + filename + extension;
          }
          this.dataFile = { event: event.target.files[0], url: filename, name: event.target.files[0].name }

        } else {
          Swal.fire(this.translate.instant("dashboardpatient.error extension"), '', "warning");
        }

      }

    }
  }

  showTextArea() {
    this.showTextAreaFlag = true;
  }

  hideTextArea() {
    this.showTextAreaFlag = false;
  }

  createFileTxt() {
    //create a .txt file with the content of medicalText textarea
    var uniqueFileName = this.getUniqueFileName();
    var filename = 'raitofile/' + uniqueFileName + '/medicalText.txt';
    var blob = new Blob([this.medicalText], { type: "text/plain;charset=utf-8" });
    this.dataFile = { event: blob, url: filename, name: 'medicalText.txt' }
    this.showTextAreaFlag = false;
  }

  unlinkFile() {
    this.dataFile = {};
  }

  async resizeTextArea() {
    setTimeout(() => {
      $('.autoajustable').each(function () {
        let height = this.scrollHeight;
        if (height < 50) {
          height = 50;
        }
        document.getElementById("textarea1").setAttribute("style", "height:" + (height) + "px;overflow-y:hidden; width: 100%;");
      }).on('input', function () {
        let height = this.scrollHeight;
        if (height < 50) {
          height = 50;
        }
        this.style.height = 'auto';
        this.style.height = (height) + 'px';
      });

    },
      100);
  }

  onFileChangeStep2() {
    const formData = new FormData();
    formData.append("thumbnail", this.dataFile.event);
    formData.append("type", 'patientGenoFiles');
    formData.append("url", this.dataFile.url);
    formData.append("containerName", this.authService.getCurrentPatient().sub.substr(1));
    var containerName = this.authService.getCurrentPatient().sub.substr(1)
    var info = { type: 'patientGenoFiles', typedocument: this.typedocument }
    if (this.typedocument == 'general') {
      formData.append("typedocument", 'general');
      this.uploadingGenotype = true;

      this.sendFile(formData, containerName, info);
    } else {
      formData.append("typedocument", 'emergency');
      this.uploadingEmergency = true;
      this.sendFile(formData, containerName, info);
    }

  }

  sendFile(formData, containerName, info) {
    this.subscription.add(this.http.post(environment.api + '/api/upload/', formData)
      .subscribe((res: any) => {
        if (this.modalReference != undefined) {
          this.modalReference.close();
          this.modalReference = undefined;
        }
        this.dataFile = {};
        if (info.typedocument == 'general') {
          this.uploadingGenotype = false;
        }
        if (info.typedocument == 'emergency') {
          this.uploadingEmergency = false;
        }
        if (info.type == 'patientGenoFiles') {
          this.blob.loadPatientGenoFiles(containerName)
          this.getDocs();
        }
        if (info.type == 'ncrInfofile') {
          this.blob.loadNcrResultsFilesPatientBlob(containerName)
        }


      }, (err) => {
        console.log(err);
        this.sendingSymptoms = false;
        if (err.error.message == 'Token expired' || err.error.message == 'Invalid Token') {
          this.authGuard.testtoken();
        } else {
          this.toastr.error('', this.msgDataSavedFail);
        }
      }));
  }

  getUniqueFileName() {
    var now = new Date();
    var y = now.getFullYear();
    var m = now.getMonth() + 1;
    var d = now.getDate();
    var h = now.getHours();
    var mm = now.getMinutes();
    var ss = now.getSeconds();
    var ff = Math.round(now.getMilliseconds() / 10);
    var date = '' + y.toString().substr(-2) + (m < 10 ? '0' : '') + m + (d < 10 ? '0' : '') + d + (h < 10 ? '0' : '') + h + (mm < 10 ? '0' : '') + mm + (ss < 10 ? '0' : '') + ss + (ff < 10 ? '0' : '') + ff;
    var randomString = this.makeid(8);
    var name = date + randomString;
    var url = y.toString().substr(-2) + '/' + (m < 10 ? '0' : '') + m + '/' + (d < 10 ? '0' : '') + d + '/' + name;
    return url;
  }

  makeid(length) {
    var result = '';
    var characters = '0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
      result += Math.floor(Math.random() * charactersLength);
    }
    return result;
  }

  deleteFile(file, i, option) {
    var filename = '';
    filename = file.simplename;
    Swal.fire({
      title: this.translate.instant("generics.Are you sure delete") + " " + filename + " ?",
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
        if (option == 'emergency') {
          this.deleteEmergencyFile(file.name, i);
        } else {
          this.deleteOtherFile(file.name, i);
        }
        this.deleteReferenceFile(file.name);
      }
    });

  }

  deleteReferenceFile(url) {
    var documentId = null;
    var enc = false;
    for (var i = 0; i < this.docs.length && !enc; i++) {
      if (this.docs[i].url == url) {
        documentId = this.docs[i]._id;
        enc = true;
      }
    }
    if (enc) {
      this.subscription.add(this.http.delete(environment.api + '/api/document/' + documentId)
        .subscribe((res: any) => {
          this.getDocs();
        }, (err) => {
          console.log(err);
          this.saving = false;
          if (err.error.message == 'Token expired' || err.error.message == 'Invalid Token') {
            this.authGuard.testtoken();
          } else {
          }
        }));
    }

  }

  deleteOtherFile(file, i) {
    var enc = false;
    var file2 = '';
    for (var j = 0; j < this.otherGeneFiles.length && !enc; j++) {
      file2 = this.otherGeneFiles[j].name.substr(0, this.otherGeneFiles[j].name.lastIndexOf('/') + 1);
      file2 = file2 + 'textanaresult.json';
      if (this.otherGeneFiles[j].name == file) {
        enc = true;
      }
    }
    this.otherGeneFiles.splice(i, 1);
    this.deleteBlob(this.accessToken.containerName, file);
    if (enc) {
      this.deleteBlob(this.accessToken.containerName, file2);
    }
  }

  deleteEmergencyFile(file, i) {
    var enc = false;
    var file2 = '';
    for (var j = 0; j < this.emergencyFiles.length && !enc; j++) {
      file2 = this.emergencyFiles[j].name.substr(0, this.emergencyFiles[j].name.lastIndexOf('/') + 1);
      file2 = file2 + 'textanaresult.json';
      if (this.emergencyFiles[j].name == file) {
        enc = true;
      }
    }
    this.emergencyFiles.splice(i, 1);
    this.deleteBlob(this.accessToken.containerName, file);
    if (enc) {
      this.deleteBlob(this.accessToken.containerName, file2);
    }
  }

  deleteBlob(containerName, file) {
    var info = { containerName: containerName, fileName: file }
    this.subscription.add(this.http.post(environment.api + '/api/deleteBlob/', info)
      .subscribe((res: any) => {
      }, (err) => {
        console.log(err);
        this.blob.loadPatientGenoFiles(containerName)
      }));
  }

  extractData(blobName, contentType) {
    this.extractingData = true;
    var url = environment.blobAccessToken.blobAccountUrl + this.accessToken.containerName + '/' + blobName + this.accessToken.sasToken;
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'blob';
    xhr.onload = function (oEvent) {
      var myBlob = xhr.response; // Note: not oReq.responseText
      const file3 = new File([myBlob], blobName, { type: contentType, lastModified: new Date().getTime() });
      if (contentType != "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        this.callParser(file3, blobName);
      } else {
        //obtener texto del word
        let reader = new FileReader();
        reader.readAsDataURL(file3); // converts the blob to base64 and calls onload
        reader.onload = function () {
          this.getTextFromDocx(reader.result, blobName);
        }.bind(this);
      }

    }.bind(this);
    xhr.send();
  }

  getTextFromDocx(data, blobName) {
    this.loadFile(data, function (err, content) {
      if (err) { console.log(err); };
      var doc = new Docxgen(content);
      var text = doc.getFullText();
      this.startExtractor(text, blobName);
    }.bind(this))
  }

  callParser(file, blobName) {

    var oReq = new XMLHttpRequest();
    var lang = this.authService.getLang();
    var self = this;

    oReq.open("PUT", environment.f29api + '/api/Document/Parse?Timeout=5000&language=' + lang + '&Strategy=OcrOnly', true);

    oReq.onload = function (oEvent) {
      // Uploaded.
      let file2 = oEvent.target;
      var target: any = {};
      target = file2;
      //target--> status, strategy, content
      var text = '';
      if (target.response.content == undefined) {
        text = '';
      } else {
        text = target.response.content
        text = text.split("\n").join(" ");
      }
      this.startExtractor(text, blobName);

    }.bind(this);
    oReq.send(file);
    const rt = "json";
    oReq.responseType = rt;
  }

  loadFile(url, callback) {
    JSZipUtils.getBinaryContent(url, callback);
  }

  startExtractor(text, blobName) {
    console.log(blobName)
    /*if (text.length < 5) {
      var actualDate = Date.now();
      this.saveResultsToBlob(text, [], actualDate, blobName);
    } else {
      var actualDate = Date.now();
      this.saveResultsToBlob(text, [], actualDate, blobName);
    }*/
    Swal.fire({
      title: this.translate.instant("docs.swal1.1"),
      text: this.translate.instant("docs.swal1.2"),
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
        this.translateText(text, blobName);
      }else{
        var actualDate = Date.now();
        this.posibleEntities = [];
        this.saveResultsToBlob(text, this.posibleEntities, actualDate, blobName);
      }
    });

    
    //this.getEntitiesForBook(text, blobName);
  }

  translateText(text, blobName){
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
                            this.getEntitiesForBook(text, blobName);
                        }, (err) => {
                            console.log(err);
                            this.getEntitiesForBook(text, blobName);
                        }));
                } else {
                  this.detectedLang = 'en';
                  this.getEntitiesForBook(text, blobName);
                }

            }, (err) => {
                console.log(err);
                this.toastr.error('', this.translate.instant("generics.error try again"));
            }));
    } else {
      this.getEntitiesForBook(text, blobName);
    }
  }


 async getEntitiesForBook(bookText, blobName) {
  this.loadingPosibleEntities = true;
  let chunkPromises = [];

  chunkPromises.push(this.callTextAnalitycs(bookText));

  Promise.all(chunkPromises).then((data) => {
    console.log("Todas las llamadas a getEntities han terminado");
    this.loadingPosibleEntities = false;
    if (bookText.length < 5) {
      var actualDate = Date.now();
      this.saveResultsToBlob(bookText, this.posibleEntities, actualDate, blobName);
    } else {
      var actualDate = Date.now();
      this.saveResultsToBlob(bookText, this.posibleEntities, actualDate, blobName);
    }
    console.log(this.posibleEntities)
    if(this.posibleEntities.length>0){
      this.currentEntity = this.posibleEntities[this.currentIndex];
      var txtNumEvents = this.translate.instant("docs.swal2.1", {
          value: this.posibleEntities.length,
      });
      Swal.fire({
        title: txtNumEvents,
        text: this.translate.instant("docs.swal2.2"),
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
          this.showEntities();
        }
      });
    }
  });
}

callTextAnalitycs(text) {
  return new Promise((resolve, reject) => {
  this.callingTextAnalytics = true;
  var info = text.replace(/\n/g, " ");
  var jsontestLangText = { "text": info };
  this.subscription.add(this.apiDx29ServerService.callTextAnalytics(jsontestLangText)
    .subscribe((res: any) => {
      console.log(res)
      this.resTextAnalyticsSegments = res;
        for (let j = 0; j < this.resTextAnalyticsSegments.entities.length; j++) {
          var actualDrug = { name: '', value: '', link: ''};
          if(this.resTextAnalyticsSegments.entities[j].confidenceScore>=0.95){
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
                  if(this.resTextAnalyticsSegments.entityRelations[k].roles[0].entity.text==actualDrug.name && this.resTextAnalyticsSegments.entityRelations[k].roles[0].entity.category=='MedicationName' && this.resTextAnalyticsSegments.entityRelations[k].roles[1].entity.category=='Dosage'){
                    actualDrug.value = this.resTextAnalyticsSegments.entityRelations[k].roles[1].entity.text;
                  }
                  if(this.resTextAnalyticsSegments.entityRelations[k].roles[1].entity.text==actualDrug.name && this.resTextAnalyticsSegments.entityRelations[k].roles[0].entity.category=='Dosage' && this.resTextAnalyticsSegments.entityRelations[k].roles[1].entity.category=='MedicationName'){
                    actualDrug.value = this.resTextAnalyticsSegments.entityRelations[k].roles[0].entity.text;
                  }
                }

              }
              if(!this.isOnEvents(actualDrug.name, 'drug')){
                this.posibleEntities.push({ name: actualDrug.name, type: 'drug', date: null, notes:'', data:  actualDrug})
              }
              
            }

            if (this.resTextAnalyticsSegments.entities[j].category == 'SymptomOrSign') {
              if(!this.isOnEvents(this.resTextAnalyticsSegments.entities[j].text, 'symptom')){
                this.posibleEntities.push({ name: this.resTextAnalyticsSegments.entities[j].text, type: 'symptom', date: null, notes:'', data:  {}})
              }
            }

            if (this.resTextAnalyticsSegments.entities[j].category == 'Diagnosis' && this.resTextAnalyticsSegments.entities[j].dataSources.length>0) {
              if(!this.isOnEvents(this.resTextAnalyticsSegments.entities[j].text, 'disease')){
                this.posibleEntities.push({ name: this.resTextAnalyticsSegments.entities[j].text, type: 'disease', date: null, notes:'', data:  {}})
              }
              
            }

            if (this.resTextAnalyticsSegments.entities[j].category == 'TreatmentName') {
              if(!this.isOnEvents(this.resTextAnalyticsSegments.entities[j].text, 'treatment')){
                this.posibleEntities.push({ name: this.resTextAnalyticsSegments.entities[j].text, type: 'treatment', date: null, notes:'', data:  {}})
              }
             
            }

            if (this.resTextAnalyticsSegments.entities[j].category == 'Allergen') {
              if(!this.isOnEvents(this.resTextAnalyticsSegments.entities[j].text, 'allergy')){
                this.posibleEntities.push({ name: this.resTextAnalyticsSegments.entities[j].text, type: 'allergy', date: null, notes:'', data:  {}})
              }
            }

            if (this.resTextAnalyticsSegments.entities[j].category == 'GeneOrProtein') {
              if (!this.isOnEvents(this.resTextAnalyticsSegments.entities[j].text, 'gene')) {
                this.posibleEntities.push({ name: this.resTextAnalyticsSegments.entities[j].text, type: 'gene', date: null, notes: '', data: {} })
              }
            }
          }            
        }
        console.log(this.posibleEntities)

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
              for(var i = 0; i < segments.length; i++){
                if (res2[i] != undefined) {
                  if (res2[i].translations[0] != undefined) {
                    //if las character is a dot, remove it
                    if (res2[i].translations[0].text.charAt(res2[i].translations[0].text.length - 1) == '.') {
                      res2[i].translations[0].text = res2[i].translations[0].text.substring(0, res2[i].translations[0].text.length - 1);
                    }
                    segments[i].text = res2[i].translations[0].text;
                    this.posibleEntities[i].name = segments[i].text;
                     if(this.isSavedEvent(this.posibleEntities[i].name, this.posibleEntities[i].type)){
                      this.posibleEntities[i].delete=true;
                    }
                  }
                }
              }
              for(var i = 0; i < this.posibleEntities.length; i++){
                if(this.posibleEntities[i].delete){
                  this.posibleEntities.splice(i, 1);
                }
              }
              console.log(this.posibleEntities)
              this.currentEntity = this.posibleEntities[this.currentIndex];
              this.callingTextAnalytics = false;
              resolve('ok');
            }, (err) => {
              console.log(err);
              this.currentEntity = this.posibleEntities[this.currentIndex];
              this.callingTextAnalytics = false;
              resolve('ok');
            }));
        }

      
      
    }, (err) => {
      console.log(err);
      this.callingTextAnalytics = false;
      resolve('ok');
    }));
  });
}

isOnEvents(eventName, type){
  var found = false;
  if (eventName.charAt(eventName.length - 1) == '.') {
    eventName = eventName.substring(0, eventName.length - 1);
  }
  for(let i=0; i<this.events.length; i++){
    if(this.events[i].name==eventName && this.events[i].type==type){
      found = true;
    }
  }
  for(let j=0; j<this.posibleEntities.length; j++){
    if(this.posibleEntities[j].name==eventName && this.posibleEntities[j].type==type){
      found = true;
    }
  }
  if(found){
    return true;
  }else{
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

  openEntities(name) {
    var url = name.substr(0, name.lastIndexOf('/') + 1)
    var fileNameNcr = url + 'textanaresult.json';
    var url2 = this.accessToken.blobAccountUrl + this.accessToken.containerName + '/' + fileNameNcr + this.accessToken.sasToken;
    this.subscription.add(this.http.get(this.accessToken.blobAccountUrl + this.accessToken.containerName + '/' + fileNameNcr + this.accessToken.sasToken)
      .subscribe((res: any) => {
        if(res.data.length>0){
          this.posibleEntities = res.data;
          this.currentEntity = this.posibleEntities[this.currentIndex];
          this.showEntities();
        }else{
          this.startExtractor(res.medicalText, name)
        }
        
      }, (err) => {
        console.log(err);
      }));
  }

  showEntities(){
    this.showingEntities = true;
  }

  hideEntities(){
    this.showingEntities = false;
    this.posibleEntities = [];
  }


  closeDateEntity(eventData: any, index: any, dp?: any) {
    this.posibleEntities[index].date = eventData;
    dp.close();
  }

  addEntity(index) {
    var info = { name: this.posibleEntities[index].name, type: this.posibleEntities[index].type, date: this.posibleEntities[index].date, notes: this.posibleEntities[index].notes };
    this.subscription.add( this.http.post(environment.api+'/api/events/'+this.authService.getCurrentPatient().sub, info)
        .subscribe( (res : any) => {
          this.events.push(info);
          this.posibleEntities.splice(index, 1);
          this.currentEntity = this.posibleEntities[this.currentIndex];
         }, (err) => {
           console.log(err);
         }));
  }

  removeEntity(index) {
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


  saveResultsToBlob(medicalText, data, actualDate, blobName) {
    var infoNcrToSave = { medicalText: medicalText, data: data, date: actualDate, blobName: blobName };
    var url = blobName.substr(0, blobName.lastIndexOf('/') + 1)
    var str = JSON.stringify(infoNcrToSave);
    var fileNameNcr = url + 'textanaresult.json';
    var file = new File([str], fileNameNcr, { type: 'application/json' });

    const formData = new FormData();
    formData.append("thumbnail", file);
    formData.append("type", 'ncrInfofile');
    formData.append("url", fileNameNcr);
    formData.append("containerName", this.authService.getCurrentPatient().sub.substr(1));
    var containerName = this.authService.getCurrentPatient().sub.substr(1)
    //formData.append("typedocument", 'general');
    var info = { type: 'ncrInfofile', typedocument: '' }
    this.sendFile(formData, containerName, info);

    this.extractingData = false;
  }

  addTemporalSymptom(symptom, inputType) {
    var foundElement = this.searchService.search(this.temporalSymptoms, 'id', symptom.id);
    if (!foundElement) {
      this.temporalSymptoms.push({ id: symptom.id, name: symptom.name, new: true, checked: null, percentile: -1, inputType: inputType, importance: '1', polarity: '0', onset: null, similarity: symptom.similarity, positions: symptom.positions, text: symptom.text });
      this.temporalSymptoms.sort(this.sortService.GetSortOrder("name"));
      return true;
    } else {
      //buscar el sintoma, mirar si tiene mejor prababilidad, y meter la nueva aparicion en posiciones
      var enc = false;
      for (var z = 0; z < this.temporalSymptoms.length && !enc; z++) {
        if (this.temporalSymptoms[z].id == symptom.id && this.temporalSymptoms[z].inputType != "manual") {
          if (this.temporalSymptoms[z].inputType == "textAnalytics") {
            this.temporalSymptoms[z].text.push(symptom.text);
          } else {
            if (this.temporalSymptoms[z].similarity < symptom.similarity) {
              this.temporalSymptoms[z].similarity = symptom.similarity;
            }
            this.temporalSymptoms[z].positions.push(symptom.positions[0]);
          }

          enc = true;
        }
      }
      return false;
    }
  }

  callGetInfoTempSymptomsJSON(hposStrins) {
    var lang = this.lang;
    this.subscription.add(this.apif29BioService.getInfoOfSymptoms(lang, hposStrins)
      .subscribe((res: any) => {
        var tamano = Object.keys(res).length;
        if (tamano > 0) {
          for (var i in res) {
            for (var j = 0; j < this.temporalSymptoms.length; j++) {
              if (res[i].id == this.temporalSymptoms[j].id) {
                this.temporalSymptoms[j].name = res[i].name;
                this.temporalSymptoms[j].def = res[i].desc;
                this.temporalSymptoms[j].synonyms = res[i].synonyms;
                this.temporalSymptoms[j].comment = res[i].comment;
                if (this.temporalSymptoms[j].importance == undefined) {
                  this.temporalSymptoms[j].importance = 1;
                }
              }
            }
          }
          this.temporalSymptoms.sort(this.sortService.GetSortOrder("name"));
        }
      }, (err) => {
        console.log(err);
      }));
  }

  openResults(name, contentviewDoc, nameTitle) {
    this.nameTitle = nameTitle;
    var url = name.substr(0, name.lastIndexOf('/') + 1)
    var fileNameNcr = url + 'textanaresult.json';
    var url2 = this.accessToken.blobAccountUrl + this.accessToken.containerName + '/' + fileNameNcr + this.accessToken.sasToken;
    this.subscription.add(this.http.get(this.accessToken.blobAccountUrl + this.accessToken.containerName + '/' + fileNameNcr + this.accessToken.sasToken)
      .subscribe((res: any) => {
        this.resultTextNcr = res.medicalText;
        this.resultTextNcrCopy = res.medicalText;
        let ngbModalOptions: NgbModalOptions = {
          keyboard: false,
          windowClass: 'ModalClass-sm'// xl, lg, sm
        };
        this.modalReference = this.modalService.open(contentviewDoc, ngbModalOptions);
      }, (err) => {
        console.log(err);
      }));

  }

  back(index) {
    this.step = index;
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

  changeStateSymptom(index) {
    this.temporalSymptoms[index].checked = !this.temporalSymptoms[index].checked;
  }

  closeModal() {
    this.dataFile = {};
    this.showTextAreaFlag = false;
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

  saveSymptomsToDb() {
    if (this.authGuard.testtoken()) {
      this.sendingSymptoms = true;

      var phenotoSave = JSON.parse(JSON.stringify(this.phenotype));
      phenotoSave.data = [];


      for (var i = 0; i < this.temporalSymptoms.length; i++) {
        var foundElement = this.searchService.search(this.phenotype.data, 'id', this.temporalSymptoms[i].id);
        if (!foundElement && this.temporalSymptoms[i].checked) {
          this.phenotype.data.push(this.temporalSymptoms[i]);
        } else if (foundElement && !this.temporalSymptoms[i].checked) {
          var foundElementIndex = this.searchService.searchIndex(this.phenotype.data, 'id', this.temporalSymptoms[i].id);
          this.phenotype.data.splice(foundElementIndex, 1);
        }
      }



      for (var i = 0; i < this.phenotype.data.length; i++) {
        if (this.phenotype.data[i].inputType == undefined) {
          phenotoSave.data.push({ id: this.phenotype.data[i].id, name: this.phenotype.data[i].name, inputType: 'unknown', importance: '1', polarity: '0', onset: null });
        } else {
          phenotoSave.data.push({ id: this.phenotype.data[i].id, name: this.phenotype.data[i].name, inputType: this.phenotype.data[i].inputType, importance: '1', polarity: '0', onset: null });
        }
      }
      this.phenotype = JSON.parse(JSON.stringify(phenotoSave));
      this.phenotype.date = Date.now();
      if (this.phenotype._id == null) {
        this.subscription.add(this.http.post(environment.api + '/api/phenotypes/' + this.authService.getCurrentPatient().sub, this.phenotype)
          .subscribe((res: any) => {
            this.sendingSymptoms = false;
            this.back('0');
          }, (err) => {
            console.log(err);
            this.sendingSymptoms = false;
            if (err.error.message == 'Token expired' || err.error.message == 'Invalid Token') {
              this.authGuard.testtoken();
            } else {
              this.toastr.error('', this.msgDataSavedFail);
            }
          }));
      } else {
        this.subscription.add(this.http.put(environment.api + '/api/phenotypes/' + this.phenotype._id, this.phenotype)
          .subscribe((res: any) => {
            this.sendingSymptoms = false;
            this.back('0');
          }, (err) => {
            console.log(err.error);
            this.sendingSymptoms = false;
            if (err.error.message == 'Token expired' || err.error.message == 'Invalid Token') {
              this.authGuard.testtoken();
            } else {
              this.toastr.error('', this.msgDataSavedFail);
            }
          }));
      }
    }
  }

  showCompleteNcrResultView(symptom, method) {
    this.ncrResultView = !this.ncrResultView;
    if (symptom != null) {
      if (method == 'ncr') {
        //this.markAllText(symptom)
      } else if (method == 'textAnalytics') {
        this.markAllTextAnalytics(symptom)
      }

    }
  }

  markAllTextAnalytics(symptom) {
    this.resultTextNcrCopy = this.resultTextNcr;
    var text = symptom.text[0].text;
    if (this.lang != 'en') {//if (this.langDetected != 'en') {
      text = symptom.text[0].text;
      var hpo = symptom;
      var words = [];
      for (var j = 0; j < hpo.text.length; j++) {
        if (hpo.text[j].positions != undefined) {
          var value = text.substring(hpo.text[j].positions[0], hpo.text[j].positions[1]);
          words.push({ args: value })
        }

      }
      this.resultTextNcrCopy = this.highlightSearch.transformAll(this.resultTextNcr, words);
    } else {
      var hpo = symptom;
      var words = [];
      for (var j = 0; j < hpo.text.length; j++) {
        if (hpo.text[j].positions != undefined) {
          var value = text.substring(hpo.text[j].positions[0], hpo.text[j].positions[1]);
          words.push({ args: value })
        }

      }
      this.resultTextNcrCopy = this.highlightSearch.transformAll(this.resultTextNcr, words);
    }
    this.showScrollButton();
  }

  showScrollButton() {
    setTimeout(() => {
      var el = document.getElementsByClassName("actualPosition")[0];
      if (el != undefined) {
        el.scrollIntoView(true);
        var height = document.getElementById('idBody').offsetHeight;
        var docHeight = $(document).height();
        if (height > docHeight) {
          this.showButtonScroll = true;
          this.myFunction();
        } else {
          this.showButtonScroll = false;
        }
      }
    }, 100);
  }

  newDoc() {
    this.step = '2';
  }

  shareFile() {
    this.step = 'share'
  }

  getLiteral(literal) {
    return this.translate.instant(literal);
  }

  get f() { return this.documentForm.controls; }

  createDocument(contentDocument, typedocument) {
    this.typedocument = typedocument;
    this.documentForm = this.formBuilder.group({
      name: ['', Validators.required],
      dateDoc: ['', Validators.required],
      url: '',
      description: [],
      notes: '',
    });

    let ngbModalOptions: NgbModalOptions = {
      keyboard: false,
      windowClass: 'ModalClass-sm'// xl, lg, sm
    };
    this.modalReference = this.modalService.open(contentDocument, ngbModalOptions);
  }

  saveData() {
    this.submitted = true;
    if (this.documentForm.invalid || this.dataFile.url == undefined) {
      return;
    }

    if (this.documentForm.value.dateDoc != null) {
      this.documentForm.value.dateDoc = this.dateService.transformDate(this.documentForm.value.dateDoc);
    }


    if (this.authGuard.testtoken()) {
      this.saving = true;
      this.documentForm.value.url = this.dataFile.url;
      this.subscription.add(this.http.post(environment.api + '/api/document/' + this.authService.getCurrentPatient().sub, this.documentForm.value)
        .subscribe((res: any) => {
          this.saving = false;
          this.submitted = false;
          this.documentForm.reset();
          this.onFileChangeStep2();
          this.blob.createContainerIfNotExists(this.accessToken, 'patientGenoFiles');
        }, (err) => {
          console.log(err);
          this.saving = false;
          if (err.error.message == 'Token expired' || err.error.message == 'Invalid Token') {
            this.authGuard.testtoken();
          } else {
          }
        }));
    }
  }

  editDocument(file, updateDocument) {
    var enc = false;
    for (var i = 0; i < this.docs.length && !enc; i++) {
      if (this.docs[i].url == file.name) {
        this.actualDoc = this.docs[i];
        this.simplename = file.simplename;
        enc = true;
      }
    }
    if (enc) {

      this.documentForm = this.formBuilder.group({
        name: [this.actualDoc.name, Validators.required],
        dateDoc: [this.dateService.transformDate(this.actualDoc.dateDoc), Validators.required],
        url: this.actualDoc.url,
        description: [this.actualDoc.description],
        notes: this.actualDoc.notes
      });
      let ngbModalOptions: NgbModalOptions = {
        keyboard: false,
        windowClass: 'ModalClass-sm'// xl, lg, sm
      };
      this.modalReference = this.modalService.open(updateDocument, ngbModalOptions);
    }
  }

  updateData() {
    this.submitted = true;
    if (this.documentForm.invalid) {
      return;
    }

    if (this.documentForm.value.dateDoc != null) {
      this.documentForm.value.dateDoc = this.dateService.transformDate(this.documentForm.value.dateDoc);
    }


    if (this.authGuard.testtoken()) {
      this.saving = true;
      this.documentForm.value.url = this.dataFile.url;
      this.actualDoc.name = this.documentForm.value.name;
      this.actualDoc.description = this.documentForm.value.description;
      this.actualDoc.notes = this.documentForm.value.notes;
      this.actualDoc.dateDoc = this.documentForm.value.dateDoc;
      this.subscription.add(this.http.put(environment.api + '/api/document/' + this.actualDoc._id, this.actualDoc)
        .subscribe((res: any) => {
          this.saving = false;
          this.submitted = false;
          this.documentForm.reset();
          if (this.modalReference != undefined) {
            this.modalReference.close();
            this.modalReference = undefined;
            this.dataFile = {};
          }
          this.blob.createContainerIfNotExists(this.accessToken, 'patientGenoFiles');
        }, (err) => {
          console.log(err);
          this.saving = false;
          if (err.error.message == 'Token expired' || err.error.message == 'Invalid Token') {
            this.authGuard.testtoken();
          } else {
          }
        }));
    }
  }

  getDocs() {
    this.docs = [];
    this.loadedDocs = false;
    this.subscription.add(this.http.get(environment.api + '/api/documents/' + this.authService.getCurrentPatient().sub)
      .subscribe((resDocs: any) => {
        if (resDocs.message) {
          //no tiene historico de docs
        } else {
          resDocs.sort(this.sortService.DateSortInver("date"));
          this.docs = resDocs;

        }

        this.loadedDocs = true;
      }, (err) => {
        console.log(err);
        this.loadedDocs = true;
        this.toastr.error('', this.translate.instant("generics.error try again"));
      }));
  }

  downloadFile(containerName, fileName) {
    var assetURL = this.accessToken.blobAccountUrl + containerName + "/" + fileName + this.accessToken.sasToken;
    this.cordovaService.downloadFile(assetURL, fileName);
  }

}
