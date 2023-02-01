import { Component, ViewChild, OnDestroy } from '@angular/core';
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
    selector: 'app-dashboard-admin',
    templateUrl: './dashboard-admin.component.html',
    styleUrls: ['./dashboard-admin.component.scss'],
    providers: [LangService]
})

export class DashboardAdminComponent implements OnDestroy{
  @ViewChild('f') newLangForm: NgForm;

  addedlang: boolean = false;
  lang: any;
  allLangs: any;
  langs: any;
  working: boolean = false;
  loadinglangs: boolean = false;
  private subscription: Subscription = new Subscription();

  constructor(private http: HttpClient, public translate: TranslateService, private authService: AuthService, private authGuard: AuthGuard, private langService: LangService, public toastr: ToastrService){
    this.loadinglangs = true;
    this.loadLanguages();
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }


  newLanguage() {
    this.loadAllLanguages();
    this.addedlang=true;
  }

  loadLanguages() {
      this.subscription.add( this.langService.getLangs()
      .subscribe( (res : any) => {
        this.langs=res;
        this.loadinglangs = false;
      }));
  }

  loadAllLanguages() {
      this.subscription.add( this.langService.getAllLangs()
      .subscribe( (res : any) => {
        this.allLangs=res;
      }));
  }

  cancelNewLang(){
    this.addedlang=false;
    this.allLangs = [];
  }

  submitInvalidForm() {
    if (!this.newLangForm) { return; }
    const base = this.newLangForm;
    for (const field in base.form.controls) {
      if (!base.form.controls[field].valid) {
          base.form.controls[field].markAsTouched()
      }
    }
  }

  submitNewLang(){
    if(this.authGuard.testtoken() && this.lang){
      //cargar los datos del usuario
      var paramssend = { code: this.lang.code, name: this.lang.nativeName};
      this.working = true;
      this.subscription.add( this.http.put(environment.api+'/api/admin/lang/'+this.authService.getIdUser(), paramssend)
      .subscribe( (res : any) => {
        this.working = false;

        if(res.message=="request for new language sent"){
          Swal.fire(this.translate.instant("lang.Request for new language sent"), this.translate.instant("generics.We will reply as soon as possible"), "success");

        }else if("already exists"){
          Swal.fire(this.translate.instant("generics.Warning"), this.translate.instant("lang.The language already exists"), "error");
        }

       }, (err) => {
         this.working = false;
         if(err.error.message=='Token expired' || err.error.message=='Invalid Token'){
           this.authGuard.testtoken();
         }else{
           this.toastr.error('', this.translate.instant("generics.error try again"));
         }
       }))
     }
    this.addedlang=false;
  }

}
