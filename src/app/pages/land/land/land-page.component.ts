import { Component, OnInit, OnDestroy } from '@angular/core';
import { environment } from 'environments/environment';
import { Router, ActivatedRoute } from "@angular/router";
import { PatientService } from 'app/shared/services/patient.service';
import { AuthService } from '../../../../app/shared/auth/auth.service';
import { EventsService } from 'app/shared/services/events.service';
import { TranslateService } from '@ngx-translate/core';
import { NgbModal, NgbModalRef, NgbModalOptions } from '@ng-bootstrap/ng-bootstrap';
import { sha512 } from "js-sha512";
import Swal from 'sweetalert2';
import { ToastrService } from 'ngx-toastr';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Web3Auth } from "@web3auth/modal";
import { LOGIN_MODAL_EVENTS } from "@web3auth/ui";
import { Subscription } from 'rxjs/Subscription';
import { ThisReceiver } from '@angular/compiler';
import { catchError, debounceTime, distinctUntilChanged, map, tap, switchMap, merge, mergeMap, concatMap } from 'rxjs/operators'
import * as decode from 'jwt-decode';

declare global {
  interface Window {
    ethereum: any;
  }
}

@Component({
  selector: 'app-land-page',
  templateUrl: './land-page.component.html',
  styleUrls: ['./land-page.component.scss'],
  providers: [PatientService]
})

export class LandPageComponent implements OnInit, OnDestroy {
  lang: string = 'en';
  sending: boolean = false;
  isBlockedAccount: boolean = false;
  isLoginFailed: boolean = false;
  isBlocked: boolean = false;
  isMobile: boolean = false;
  isModalLoaded = false;
  web3auth: Web3Auth | null = null;
  modalReference: NgbModalRef;
  langWeb3auth: string = 'en';
  detectedMetamask: boolean = false;
  showMsgMetamask: boolean = false;

  private subscription: Subscription = new Subscription();

  constructor(private route: ActivatedRoute, private http: HttpClient, public authService: AuthService, public translate: TranslateService, private patientService: PatientService, private router: Router, public toastr: ToastrService, private modalService: NgbModal, private eventsService: EventsService) {
    this.lang = sessionStorage.getItem('lang');
    this.langWeb3auth = sessionStorage.getItem('lang')
    if(sessionStorage.getItem('lang')=='fr' || sessionStorage.getItem('lang')=='it' || sessionStorage.getItem('lang')=='pt'){
      this.langWeb3auth = 'en';
    }

    this.route.fragment
    .pipe(
      map(fragment => new URLSearchParams(fragment)),
      map(params => ({
        result: params.get('result'),
        _pid: params.get('_pid'),
        sessionId: params.get('sessionId'),
      }))
    )
    .subscribe(res => {
      if(res.result && res._pid && res.sessionId){
        //this.callbacktest(res);
        this.login();
      }else{
        this.authService.logout2();
      }
    });
    
    this.isMobile = this.authService.getIsDevice();

    this.checkMetamark();
  }

  checkMetamark(){
    if(localStorage.getItem('hideIntroLogins')){
      this.showMsgMetamask = true;
    }
    this.detectedMetamask = false;
    if (window.ethereum) {
      const { ethereum } = window;
      if (!ethereum.isMetaMask) {
        console.error('Please install MetaMask!')
      }else{
        this.detectedMetamask = true;
      }
    }else{
      console.error('Please install MetaMask!')
    }
  }

  async callbacktest(res) {
    var sig = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.'+res.result+'.a4VgwATT-RvXvH799RVD4nUdAcOvjUMRoM_Xitlax4Y';
    var tokenPayload = decode(sig);
    //verificar el tokenpayload
    var tokenPayload2 = decode(tokenPayload.store.idToken);
    //si es valido, continuar
    try {
      const res = await this.authService.verifCallback(tokenPayload2.wallets[0].public_key,tokenPayload.privKey, tokenPayload.store.idToken )
      this.testAccount(res)
    } catch (error) {
      console.log(error);
    }
  }

  async start() {
    if (this.authService.getEnvironment()) {
      this.translate.use(this.authService.getLang());
      sessionStorage.setItem('lang', this.authService.getLang());
      let url = this.authService.getRedirectUrl();
      this.router.navigate([url]);

    }else{
      //this.authService.logout2();
      //console.log(localStorage.getItem('openlogin_store'));
      /*if(localStorage.getItem('openlogin_store')!=null){
        this.login();
      }*/
    }
  }

  async ngOnInit() {
    this.eventsService.on('changelang', function (lang) {
      this.lang = lang;
      this.langWeb3auth = sessionStorage.getItem('lang')
      if(sessionStorage.getItem('lang')=='fr' || sessionStorage.getItem('lang')=='it' || sessionStorage.getItem('lang')=='pt'){
        this.langWeb3auth = 'en';
      }
    }.bind(this));

    this.start();
    
  }

  ngOnDestroy() {
    //this.subscription.unsubscribe();
  }

  login = async () => {
    if(localStorage.getItem('hideIntroLogins') == null || !localStorage.getItem('hideIntroLogins')){
      document.getElementById("openModalIntro").click();
    }
    this.web3auth = this.authService.initWeb3Auth();
    this.web3auth.on(LOGIN_MODAL_EVENTS.MODAL_VISIBILITY, (isVisible) => {
      if(!isVisible){
        //this.authService.logout2();
        this.sending = false;
      }
      
    });
    this.sending = true;
    try {
      const res = await this.authService.login();
      this.testAccount(res)
    } catch (error) {
      console.log(error);
      this.sending = false;
      if(error.name=='Verification Failed'){

      }else{
        this.authService.logout();
        if(error.message=='User rejected the request.'){
          window.location.reload();
        }
      }
      
    }
    
  };

  async testAccount(info){
      this.subscription.add(this.authService.signinUseWallet(info).subscribe(
      authenticated => {
        if (authenticated.isloggedIn) {
          this.translate.use(this.authService.getLang());
          sessionStorage.setItem('lang', this.authService.getLang());
          let url = this.authService.getRedirectUrl();
          if (this.authService.getRole() == 'User') {
            this.subscription.add(this.patientService.getPatientId()
              .subscribe((res: any) => {
                this.authService.setCurrentPatient(res);
                this.router.navigate([url]);
                this.sending = false;
              }, (err) => {
                console.log(err);
                this.sending = false;
              }));
          } else {
            this.sending = false;
            this.router.navigate([url]);
          }

        } else {
          this.sending = false;
          let message = this.authService.getMessage();
          if (message == "Login failed" || message == "Not found") {
            this.isLoginFailed = true;
          } else if (message == "Account is temporarily locked") {
            this.isBlockedAccount = true;
          } else if (message == "Account is blocked") {
            this.isBlocked = true;
          } else {
            this.toastr.error('', message);
          }
        }
      }
    ));
  }

  showPanelIntro(content){
    if(this.modalReference!=undefined){
      this.modalReference.close();
    }
    let ngbModalOptions: NgbModalOptions = {
          backdrop : 'static',
          keyboard : false,
          windowClass: 'ModalClass-lg'
    };
    this.modalReference = this.modalService.open(content, ngbModalOptions);
  }

  showOptions($event){
    if($event.checked){
      localStorage.setItem('hideIntroLogins', 'true')
    }else{
      localStorage.setItem('hideIntroLogins', 'false')
    }
  }
}
