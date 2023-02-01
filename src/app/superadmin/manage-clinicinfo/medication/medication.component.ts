import { Component, ViewChild, OnInit, OnDestroy } from '@angular/core';
import { Router } from "@angular/router";
import { NgForm, FormControl } from '@angular/forms';
import { environment } from 'environments/environment';
import { HttpClient } from "@angular/common/http";
import { LangService } from 'app/shared/services/lang.service';
import { AuthService } from 'app/shared/auth/auth.service';
import { DateService } from 'app/shared/services/date.service';
import { ToastrService } from 'ngx-toastr';
import { SearchFilterPipe} from 'app/shared/services/search-filter.service';
import { TranslateService } from '@ngx-translate/core';
import { AuthGuard } from 'app/shared/auth/auth-guard.service';
import Swal from 'sweetalert2';
import { SortService} from 'app/shared/services/sort.service';
import { Subscription } from 'rxjs/Subscription';

@Component({
    selector: 'app-medication',
    templateUrl: './medication.component.html',
    styleUrls: ['./medication.component.scss']
})

export class MedicationComponent implements OnInit, OnDestroy{
  //Variable Declaration
  groups: Array<any> = [];
  groupSelected: any ={};

  @ViewChild('f') medicationsForm: NgForm;
  medications: any;
  medicationsCopy: any;
  private msgDataSavedOk: string;
  private msgDataSavedFail: string;
  loading: boolean = false;
  sending: boolean = false;
  drugName: string = '';
  drugsSideEffectsform = new FormControl();
  drugsSideEffects: any = [];
  translations: any = [];
  langs: any;
  editing: boolean = false;
  editingIndex: number = -1;

  @ViewChild('fsideEffect') sideEffectForm: NgForm;
  translationssideEffect: any = [];
  sideEffectName: string = '';
  editingSe: boolean = false;
  editingIndexSe: number = -1;

  @ViewChild('fadverseEffect') adverseEffectForm: NgForm;
  translationsadverseEffect: any = [];
  adverseEffectName: string = '';
  editingAe: boolean = false;
  editingIndexAe: number = -1;
  private subscription: Subscription = new Subscription();

  constructor(private http: HttpClient, private authService: AuthService, private dateService: DateService, public toastr: ToastrService, public searchFilterPipe: SearchFilterPipe, public translate: TranslateService, private authGuard: AuthGuard, private router: Router, private langService: LangService, private sortService: SortService) {
      this.loadLanguages();
  }

  loadLanguages() {
    this.subscription.add( this.langService.getLangs()
    .subscribe( (res : any) => {
      this.langs=res;
      this.initTranslations();
    }));
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  initTranslations(){
    this.translations = [];
    this.translationssideEffect = [];
    this.translationsadverseEffect = [];
    this.drugName = '';
    this.drugsSideEffects = [];
    this.sideEffectName = '';
    this.adverseEffectName = '';
    for(var i = 0; i < this.langs.length; i++) {
      this.translations.push({code:this.langs[i].code, name: ''});
      this.translationssideEffect.push({code:this.langs[i].code, name: ''});
      this.translationsadverseEffect.push({code:this.langs[i].code, name: ''});
    }
  }

  ngOnInit() {
    console.log('ngOnInit');
    this.medications = {
      drugs: [],
      sideEffects: [],
      adverseEffects : []
    };


    this.loadTranslations();

    this.loadGroups();


  }



  loadGroups() {
    //cargar los grupos actuales
    this.subscription.add( this.http.get(environment.api+'/api/groups/')
    .subscribe( (res : any) => {
      res.sort(this.sortService.GetSortOrder("order"));
      this.groups = res;
     }, (err) => {
       console.log(err);
     }));
  }

  onChangeGroup(value){
    this.resetForm();
    this.initTranslations();
    //cargar la info
    this.loading = true;
    this.subscription.add( this.http.get(environment.api+'/api/group/medications/'+value._id)
    .subscribe( (res : any) => {
      if(res.medications.data.length == 0){
        //no tiene medications
        this.resetForm();
      }else{
        this.medications = res.medications.data;
        this.medications.drugs.sort(this.sortService.GetSortOrder("name"));
      }
      this.loading = false;
     }, (err) => {
       console.log(err);
       this.loading = false;
     }));

  }

  resetForm() {
    this.medications = {
      drugs: [],
      sideEffects: [],
      adverseEffects : []
    };
  }

  //traducir cosas
  loadTranslations(){
    this.translate.get('generics.Data saved successfully').subscribe((res: string) => {
      this.msgDataSavedOk=res;
    });
    this.translate.get('generics.Data saved fail').subscribe((res: string) => {
      this.msgDataSavedFail=res;
    });
  }

  addDrug(){
    this.medications.drugs.push({name: this.drugName, new: true, translations: JSON.parse(JSON.stringify(this.translations)), drugsSideEffects: this.drugsSideEffects});
    this.drugName = '';
    this.initTranslations();
    this.medicationsForm.reset();
  }

  editDrug(index){
    this.editingIndex = index;
    this.editing = true;
    this.translations = JSON.parse(JSON.stringify(this.medications.drugs[index].translations));
    this.drugName = this.medications.drugs[index].name;
    this.drugsSideEffects = this.medications.drugs[index].drugsSideEffects;
  }

  updateDrug(){
    this.medications.drugs[this.editingIndex].translations = JSON.parse(JSON.stringify(this.translations));
    this.medications.drugs[this.editingIndex].name = this.drugName;
    this.medications.drugs[this.editingIndex].drugsSideEffects = this.drugsSideEffects;
    this.medications.drugs[this.editingIndex].new = true;
    this.editing = false;
    this.editingIndex = -1;
    this.initTranslations();
    this.medicationsForm.reset();
  }

  submitInvalidForm() {
    if (!this.medicationsForm) { return; }
    const base = this.medicationsForm;
    for (const field in base.form.controls) {
      if (!base.form.controls[field].valid) {
          base.form.controls[field].markAsTouched()
      }
    }
  }


  confirmDeleteDrug(index){
    Swal.fire({
        title: this.translate.instant("generics.Are you sure?"),
        html: this.translate.instant("generics.Delete")+': '+ this.medications.drugs[index].name,
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
        this.medications.drugs.splice(index, 1);
      }
    });
  }

  deleteAllDrugs(){
    Swal.fire({
        title: this.translate.instant("generics.Are you sure?"),
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
        this.medications.drugs = [];
        this.onSubmit();
      }
    });
  }


  //SIDE Effects
  addSideEffect(){
    this.medications.sideEffects.push({name: this.sideEffectName, new: true, translationssideEffect: JSON.parse(JSON.stringify(this.translationssideEffect))});
    this.sideEffectName = '';
    this.initTranslations();
    this.sideEffectForm.reset();
  }

  editSideEffect(index){
    this.editingIndexSe = index;
    this.editingSe = true;
    this.translationssideEffect = JSON.parse(JSON.stringify(this.medications.sideEffects[index].translationssideEffect));
    this.sideEffectName = this.medications.sideEffects[index].name;
  }

  updateSideEffect(){
    this.medications.sideEffects[this.editingIndexSe].translationssideEffect = JSON.parse(JSON.stringify(this.translationssideEffect));
    this.medications.sideEffects[this.editingIndexSe].name = this.sideEffectName;
    this.medications.sideEffects[this.editingIndexSe].new = true;
    this.editingSe = false;
    this.editingIndexSe = -1;
    this.initTranslations();
    this.sideEffectForm.reset();
  }

  submitInvalidFormSideEffects() {
    if (!this.sideEffectForm) { return; }
    const base = this.sideEffectForm;
    for (const field in base.form.controls) {
      if (!base.form.controls[field].valid) {
          base.form.controls[field].markAsTouched()
      }
    }
  }


  confirmDeleteSideEffect(index){
    Swal.fire({
        title: this.translate.instant("generics.Are you sure?"),
        html: this.translate.instant("generics.Delete")+': '+ this.medications.sideEffects[index].name,
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
        this.medications.sideEffects.splice(index, 1);
      }
    });
  }

  deleteAllSideEffects(){
    Swal.fire({
        title: this.translate.instant("generics.Are you sure?"),
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
        this.medications.sideEffects = [];
        this.onSubmit();
      }
    });
  }


  // adverseEffects
  addAdverseEffect(){
    this.medications.adverseEffects.push({name: this.adverseEffectName, new: true, translationsadverseEffect: JSON.parse(JSON.stringify(this.translationsadverseEffect))});
    this.adverseEffectName = '';
    this.initTranslations();
    this.adverseEffectForm.reset();
  }

  editAdverseEffect(index){
    this.editingIndexAe = index;
    this.editingAe = true;
    this.translationsadverseEffect = JSON.parse(JSON.stringify(this.medications.adverseEffects[index].translationsadverseEffect));
    this.adverseEffectName = this.medications.adverseEffects[index].name;
  }

  updateAdverseEffect(){
    this.medications.adverseEffects[this.editingIndexAe].translationsadverseEffect = JSON.parse(JSON.stringify(this.translationsadverseEffect));
    this.medications.adverseEffects[this.editingIndexAe].name = this.adverseEffectName;
    this.medications.adverseEffects[this.editingIndexAe].new = true;
    this.editingAe = false;
    this.editingIndexAe = -1;
    this.initTranslations();
    this.adverseEffectForm.reset();
  }

  submitInvalidFormAdverseEffects() {
    if (!this.adverseEffectForm) { return; }
    const base = this.adverseEffectForm;
    for (const field in base.form.controls) {
      if (!base.form.controls[field].valid) {
          base.form.controls[field].markAsTouched()
      }
    }
  }


  confirmDeleteAdverseEffect(index){
    Swal.fire({
        title: this.translate.instant("generics.Are you sure?"),
        html: this.translate.instant("generics.Delete")+': '+ this.medications.adverseEffects[index].name,
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
        this.medications.adverseEffects.splice(index, 1);
      }
    });
  }

  deleteAllAdverseEffects(){
    Swal.fire({
        title: this.translate.instant("generics.Are you sure?"),
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
        this.medications.adverseEffects = [];
        this.onSubmit();
      }
    });
  }

  onSubmit() {

    if(this.authGuard.testtoken()){
      this.sending = true;

      for(var drug in this.medications.drugs){
        delete this.medications.drugs[drug].new;
      }

      for(var sideEffect in this.medications.sideEffects){
        delete this.medications.sideEffects[sideEffect].new;
      }

      for(var adverseEffect in this.medications.adverseEffects){
        delete this.medications.adverseEffects[adverseEffect].new;
      }

      var paramssend = { _id: this.groupSelected._id, medications: this.medications};
      this.subscription.add( this.http.put(environment.api+'/api/group/medications/'+this.authService.getIdUser(), paramssend)
      .subscribe( (res : any) => {
        this.toastr.success('', this.translate.instant("generics.Data saved successfully"));
          this.sending = false;
       }, (err) => {
         if(err.error.message=='Token expired' || err.error.message=='Invalid Token'){
           this.authGuard.testtoken();
         }else{
           this.toastr.error('', this.translate.instant("generics.Data saved fail"));
         }
         this.sending = false;
       }));
    }
  }

}
