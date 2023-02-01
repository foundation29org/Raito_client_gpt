import { Component, ViewChild, ViewEncapsulation, OnDestroy } from '@angular/core';
import { NgForm } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { environment } from 'environments/environment';
import { HttpClient } from "@angular/common/http";
import { AuthService } from 'app/shared/auth/auth.service';
import { AuthGuard } from 'app/shared/auth/auth-guard.service';
import { LangService } from 'app/shared/services/lang.service';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';
import { Subscription } from 'rxjs/Subscription';

@Component({
    selector: 'app-translations',
    templateUrl: './translations.component.html',
    styleUrls: ['./translations.component.scss'],
    providers: [LangService],
    encapsulation: ViewEncapsulation.None
})

export class TranslationsComponent implements OnDestroy{
  @ViewChild('form') translateForm: NgForm;

  langs: any;
  dataorigin:any=null;
  datadest:any=null;
  keys: string[];
  keyslevel2: any;
  lang: string = '';
  lang2: string = '';
  loadingTranslations: boolean = false;
  sendingTranslations: boolean = false;
  private subscription: Subscription = new Subscription();

  constructor(private http: HttpClient, public translate: TranslateService, private authService: AuthService, private authGuard: AuthGuard, private langService: LangService, public toastr: ToastrService){
    this.loadingTranslations = true;
    this.loadLanguages();

    this.lang = this.authService.getLang();
    this.onChangeLang(this.lang);
    this.lang2 = this.authService.getLang();
    this.onChangeLang2(this.lang2);
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  loadLanguages() {
      this.subscription.add( this.langService.getLangs()
      .subscribe( (res : any) => {
        this.langs=res;
      }));
  }

  onChangeLang(newValue) {
    this.subscription.add( this.langService.loadDataJson(newValue)
    .subscribe( (res : any) => {
      this.dataorigin=[];
      this.dataorigin=res.jsonData;
     }, (err) => {
       console.log(err);
     }));
  }

  onChangeLang2(newValue) {
    this.loadingTranslations = true;
    this.subscription.add( this.langService.loadDataJson(newValue)
    .subscribe( (res : any) => {
      this.datadest=[];
      this.keyslevel2=[];
      this.keys=Object.keys(res.jsonData);
      for (var i = 0; i < this.keys.length; i++) {
        var tempo = this.keys[i];
        this.keyslevel2.push(Object.keys(res.jsonData[tempo]));
      }
      this.datadest=res.jsonData;
      this.loadingTranslations = false;
     }, (err) => {
       console.log(err);
       this.loadingTranslations = false;
     }));
  }

  submitInvalidForm() {
    if (!this.translateForm) { return; }
    const base = this.translateForm;
    for (const field in base.form.controls) {
      if (!base.form.controls[field].valid) {
          base.form.controls[field].markAsTouched()
      }
    }
  }

  onSubmit() {
    if(this.authGuard.testtoken()){
      this.sendingTranslations = true;
      var paramssend = { lang: this.lang2, jsonData: this.datadest };
      //cargar los datos del usuario
      this.subscription.add( this.http.post(environment.api+'/api/admin/lang/'+this.authService.getIdUser(), paramssend)
      .subscribe( (res : any) => {
        Swal.fire(this.translate.instant("lang.Request for new translation sent"), this.translate.instant("generics.We will reply as soon as possible"), "success");
        this.sendingTranslations = false;
       }, (err) => {
         console.log(err);
         if(err.error.message=='Token expired' || err.error.message=='Invalid Token'){
           this.authGuard.testtoken();
         }else{
          Swal.fire(this.translate.instant("generics.Warning"), this.translate.instant("lang.The language already exists"), "error");
         }
         this.sendingTranslations = false;
       }));

     }
  }

}
