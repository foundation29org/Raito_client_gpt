import { Router } from '@angular/router';
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient } from "@angular/common/http";
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/of';
import 'rxjs/add/operator/map';
import * as decode from 'jwt-decode';
import { ICurrentPatient } from './ICurrentPatient.interface';

import { Web3Auth } from "@web3auth/modal";
import { CHAIN_NAMESPACES, SafeEventEmitterProvider, ADAPTER_EVENTS } from "@web3auth/base";
const clientId = environment.web3authClient; // get from https://dashboard.web3auth.io

import RPC from "./web3RPC";
import { getPublicCompressed } from "@toruslabs/eccrypto";
import { sha512 } from "js-sha512";
var Web3 = require('web3');
var web3 = new Web3(Web3.givenProvider || null);
//var web3 = new Web3(Web3.givenProvider || 'ws://some.local-or-remote.node:8546');

import { LOGIN_MODAL_EVENTS } from "@web3auth/ui";
import { OpenloginAdapter }  from "@web3auth/openlogin-adapter";
import { MetamaskAdapter } from "@web3auth/metamask-adapter";


const metamaskAdapter = new MetamaskAdapter({
  clientId: clientId,
});

declare global {
  interface Window {
    ethereum: any;
  }
}

@Injectable()
export class AuthService {
  private token: string;
  private loginUrl: string = '/.';
  private redirectUrl: string = '/home';
  private isloggedIn: boolean = false;
  private message: string;
  private iduser: string;
  private role: string;
  private subrole: string;
  private group: string;
  private lang: string;
  private platform: string;
  private expToken: number = null;
  private currentPatient: ICurrentPatient = null;
  private patientList: Array<ICurrentPatient> = null;
  isMobile: boolean = false;
  langWeb3auth: string = 'en';
  web3auth: Web3Auth | null = null;
  provider: SafeEventEmitterProvider | null = null;
  isModalLoaded = false;
  uxMode:any = 'popup'
  network:any = 'testnet'
  constructor(private http: HttpClient, private router: Router) {
    this.isMobile = false;
    var touchDevice = (navigator.maxTouchPoints || 'ontouchstart' in document.documentElement);
    console.log('touchDevice', touchDevice)
    if (touchDevice>1 && /Android/i.test(navigator.userAgent)) {
      this.isMobile = true;
    } else if (touchDevice>1 && /iPhone/i.test(navigator.userAgent)) {
      this.isMobile = true;
    }
  }

  getIsDevice(){
    return this.isMobile;
  }

  initWeb3Auth(){
    this.web3auth = null;
    this.langWeb3auth = sessionStorage.getItem('lang')
    if(sessionStorage.getItem('lang')=='fr' || sessionStorage.getItem('lang')=='it' || sessionStorage.getItem('lang')=='pt'){
      this.langWeb3auth = 'en';
    }
    if(this.isMobile){
      this.uxMode = 'redirect'
    }else{
      this.uxMode = 'popup'
    }
    //this.uxMode = 'redirect'
    this.web3auth = new Web3Auth({
      clientId,
      chainConfig: {
        chainNamespace: CHAIN_NAMESPACES.EIP155,
        chainId: "0x1",
        rpcTarget: "https://rpc.ankr.com/eth", // This is the public RPC we have added, please pass on your own endpoint while creating an app
      },
      uiConfig: {
        theme: "light",
        loginMethodsOrder: [],
        appLogo: "https://raito.care/assets/img/logo.png", // Your App Logo Here
      },
      authMode: 'WALLET',
    });
    
    if(environment.production){
      this.network = "mainnet"
    }else{
      this.network = "testnet";
    }
    const openloginAdapter = new OpenloginAdapter({
      adapterSettings: {
        clientId, //Optional - Provide only if you haven't provided it in the Web3Auth Instantiation Code
        network: this.network,//mainnet or testnet
        //redirectUrl: "com.web3auth.app://auth",
        uxMode: this.uxMode,//redirect
        whiteLabel: {
          name: "Raito",
          logoLight: "https://raito.care/assets/img/logo.png",
          logoDark: "https://raito.care/assets/img/logo.png",
          dark: false, // whether to enable dark mode. defaultValue: false
        },
      },
    });
   
    this.web3auth.configureAdapter(openloginAdapter);
    if (window.ethereum) {
      const { ethereum } = window;
      if (ethereum.isMetaMask) {
        this.web3auth.configureAdapter(metamaskAdapter);
      }else{
        console.error('Please install MetaMask!')
      }
      
    }else{
      console.error('Please install MetaMask!')
    }
    
    // subscribe to lifecycle events emitted by web3auth
    this.web3auth.on(ADAPTER_EVENTS.CONNECTED, (data: any) => {
      console.log("connected to wallet", data);
      // web3auth.provider will be available here after user is connected
    });
    this.web3auth.on(ADAPTER_EVENTS.CONNECTING, () => {
      console.log("connecting");
    });
    this.web3auth.on(ADAPTER_EVENTS.DISCONNECTED, () => {
      console.log("disconnected");
    });
    this.web3auth.on(ADAPTER_EVENTS.ERRORED, (error) => {
      console.log("error", error);
    });
    this.web3auth.on(ADAPTER_EVENTS.NOT_READY, () => {
      console.log("not ready");
    });
    this.web3auth.on(ADAPTER_EVENTS.READY, () => {
      console.log("ready");
    });

    return this.web3auth;
  }

  getProvider(): SafeEventEmitterProvider {
    return this.provider;
  }

  getWeb3auth(): Web3Auth {
    return this.web3auth;
  }

  login = async () => {
    return new Promise(async function (resolve, reject) {
      if (!this.web3auth) {
        console.log("web3auth not initialized yet");
        reject ("web3auth not initialized yet");
      }else{    
        const web3auth = this.web3auth;
        try {
          await web3auth.initModal();
        } catch (error) {
          console.log("error initializing modal", error);
          reject (error)
        }
        
        try {
          this.provider = await web3auth.connect();
        } catch (error) {
          console.log("error", error);
          reject (error)
        }
        
        var openlogin_store = JSON.parse(localStorage.getItem('openlogin_store'));
        var aggregateVerifier = openlogin_store.aggregateVerifier;
        var openlogin_store2 = localStorage.getItem('Web3Auth-cachedAdapter');
        //if(aggregateVerifier=='tkey-auth0-email-passwordless' || aggregateVerifier=='tkey-google' && (openlogin_store2!='metamask')){
        if(openlogin_store2=='openlogin'){
          try {
            var data = await this.verif(web3auth, this.provider);
            resolve (data);
          } catch (error) {
            console.log(error)
            reject (error)
          }
          
        }else if(openlogin_store2=='metamask'){
          try {
            var data = await this.verifWallet(web3auth, this.provider);
            resolve (data);
          } catch (error) {
            console.log(error)
            reject (error)
          }
          
        }
      }
    }.bind(this));
  };

  logout2 = async () => {
    if (!this.web3auth) {
      console.log("web3auth not initialized yet");
      return;
    }else{
      const web3auth = this.web3auth;
      await web3auth.logout({ cleanup: true });
      this.provider = null;
      console.log("logged out");
    }
    
  };

  async verif(web3auth, provider) {
    return new Promise(async function (resolve, reject) {
      const app_scoped_privkey = await web3auth.provider?.request({
        method: "eth_private_key", // use "private_key" for other non-evm chains
      });
      const app_pub_key = getPublicCompressed(Buffer.from(app_scoped_privkey.padStart(64, "0"), "hex")).toString("hex");
      /* Assuming user is logged in, get the userInfo containtaing idToken */
      const user = await web3auth.getUserInfo();
      // Verify idToken at your backend server
      const response = await fetch(environment.api + "/api/verifyweb3auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + user.idToken, // or token.idToken
        },
        body: JSON.stringify({ appPubKey: app_pub_key}),
      }).then( async (response2 : any) => {
        const responseData = await response2.json()
        if (response2.ok) {
          const rpc = new RPC(provider);        
          const address = await rpc.getAccounts();
          if(responseData.name=='Verification Failed'){
            reject('Verification Failed')
          }else{
            var respu = {appPubKey: app_pub_key, idToken: user.idToken, ethAddress: address, lang: sessionStorage.getItem('lang'), method:'2.0'}
            resolve (respu)
            //await this.testAccount(app_pub_key, user.idToken, address, privateKeysha);
          }
        } else {
          reject(responseData)
        }
       }, (err) => {
         reject(err)
       });
    }.bind(this));
  }

  async verifCallback(app_pub_key, PrivateKey, idToken) {
    return new Promise(async function (resolve, reject) {
      // Verify idToken at your backend server
      const response = await fetch(environment.api + "/api/verifyweb3auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + idToken, // or token.idToken
        },
        body: JSON.stringify({ appPubKey: app_pub_key}),
      }).then( async (response2 : any) => {        
        const responseData = await response2.json()
        if (response2.ok) {
          try {
            let account = Web3.eth.accounts.privateKeyToAccount(PrivateKey);
            let address = account.address;
            if(responseData.name=='Verification Failed'){
              reject('Verification Failed')
            }else{
              var respu = {appPubKey: app_pub_key, idToken: idToken, ethAddress: address, lang: sessionStorage.getItem('lang'), method:'2.0'}
              resolve (respu)
              //await this.testAccount(app_pub_key, user.idToken, address, privateKeysha);
            }
          } catch (error) {
            console.log(error);
            return error as string;
          }
          
        } else {
          reject(responseData)
        }
       }, (err) => {
         reject(err)
       });
    }.bind(this));
  }

  async verifWallet(web3auth, provider) {
    return new Promise(async function (resolve, reject) {
      const address = (await web3.eth.getAccounts())[0];
      /* Assuming user is logged in, get the userInfo containtaing idToken */
      try {
        const token = await web3auth.authenticateUser();
      // Verify idToken at your backend server
      const response = await fetch(environment.api + "/api/verifyweb3authwallet", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token.idToken, // or token.idToken
        },
        body: JSON.stringify({ public_address: address}),
      }).then( async (response2 : any) => {
        const responseData = await response2.json()
        if (response2.ok) {
          const rpc = new RPC(provider);        
          const address2 = await rpc.getAccounts();
          if(responseData.name=='Verification Failed'){
            reject('Verification Failed')
          }else{
            var respu = {appPubKey: address, idToken: token.idToken, ethAddress: address2, lang: sessionStorage.getItem('lang'), method:'wallet'}
            resolve (respu)
            //await this.testAccount(app_pub_key, user.idToken, address, privateKeysha);
          }
        } else {
          reject(responseData)
        }
       }, (err) => {
         reject(err)
       });
      } catch (error) {
        reject(error)
      }
      
    }.bind(this));
  }


  getEnvironment():boolean{
    if(localStorage.getItem('token')){
      this.setLang(sessionStorage.getItem('lang'));
      if(sessionStorage.getItem('lang')=='es'){
        sessionStorage.setItem('culture', 'es-ES');
      }else if(sessionStorage.getItem('lang')=='de'){
        sessionStorage.setItem('culture', 'de-DE');
      }else if(sessionStorage.getItem('lang')=='fr'){
        sessionStorage.setItem('culture', 'fr-FR');
      }else if(sessionStorage.getItem('lang')=='it'){
        sessionStorage.setItem('culture', 'it-IT');
      }else if(sessionStorage.getItem('lang')=='pt'){
        sessionStorage.setItem('culture', 'pt-PT');
      }else{
        sessionStorage.setItem('culture', 'en-EN');
      }
      this.setAuthenticated(localStorage.getItem('token'));
      const tokenPayload = decode(localStorage.getItem('token'));
      this.setIdUser(tokenPayload.sub);
      this.setExpToken(tokenPayload.exp);
      this.setRole(tokenPayload.role);
      this.setSubRole(tokenPayload.subrole);

      if(tokenPayload.role == 'SuperAdmin'){
        // is role superadmin
        this.setRedirectUrl('/superadmin/dashboard-superadmin')
      }else if(tokenPayload.role == 'Clinical'){
        // is role Clinical
        this.setRedirectUrl('/clinical/dashboard/home')
      }else if(tokenPayload.role == 'Admin'){
        // Admin
        this.setRedirectUrl('/admin/dashboard-admin')
      }
      else{
        // is role user
        this.setRedirectUrl('/home')

      }
      //this.setGroup(tokenPayload.group);

      this.setPlatform(sessionStorage.getItem('platform'));
      if(sessionStorage.getItem('platform')!=undefined){
        if(sessionStorage.getItem('platform')=='H29'){
          window.location.href = 'https://health29-dev.azurewebsites.net/'
        }
      }

      return true;
    }else{
      return false;
    }
  }

  setEnvironment(token:string):void{
    this.setAuthenticated(token);
    // decode the token to get its payload
    const tokenPayload = decode(token);
    this.setIdUser(tokenPayload.sub);
    this.setExpToken(tokenPayload.exp);
    this.setRole(tokenPayload.role);
    this.setSubRole(tokenPayload.subrole);
    if(tokenPayload.role == 'SuperAdmin'){
      // is role superadmin
      this.setRedirectUrl('/superadmin/dashboard-superadmin')
    }else if(tokenPayload.role == 'Clinical'){
      // is role clinic
      this.setRedirectUrl('/clinical/dashboard/home')
    }else if(tokenPayload.role == 'Admin'){
      // Admin
      this.setRedirectUrl('/admin/dashboard-admin')
    }else{
      // is role user
      this.setRedirectUrl('/home')
    }
    //this.setGroup(tokenPayload.group);
    //save localStorage
    localStorage.setItem('token', token)
  }

  signinUser(formValue: any): Observable<any> {
    //your code for signing up the new user
    return this.http.post(environment.api+'/api/verifyweb3auth2',formValue)
      .map( (res : any) => {
        var isFirstTime = false;
          if(res.message == "You have successfully logged in"){
            //entrar en la app
            this.setLang(res.lang);
            sessionStorage.setItem('lang', res.lang)

            this.setEnvironment(res.token);

            this.setPlatform(res.platform);
            sessionStorage.setItem('platform', res.platform)
            if(res.platform=='H29'){
              window.location.href = 'https://health29-dev.azurewebsites.net/';
            }

          }else{
            this.isloggedIn = false;
          }
          if(res.isFirstTime){
            isFirstTime = true;
          }
          this.setMessage(res.message);
          return {isloggedIn: this.isloggedIn, isFirstTime: isFirstTime} ;
          //return this.isloggedIn;
       }, (err) => {
         console.log(err);
         //this.isLoginFailed = true;
         this.setMessage("Login failed");
         this.isloggedIn = false;
         return {isloggedIn: this.isloggedIn, isFirstTime: false} ;
         //return this.isloggedIn;
       }
    );
  }

  signinUseWallet(formValue: any): Observable<any> {
    //your code for signing up the new user
    var url = '/api/verifyweb3auth2'
    if(formValue.method!='2.0'){
      url = '/api/verifyweb3auth2wallet'
    }
    return this.http.post(environment.api+url,formValue)
      .map( (res : any) => {
        var isFirstTime = false;
          if(res.message == "You have successfully logged in"){
            //entrar en la app
            this.setLang(res.lang);
            sessionStorage.setItem('lang', res.lang)

            this.setEnvironment(res.token);

            this.setPlatform(res.platform);
            sessionStorage.setItem('platform', res.platform)
            if(res.platform=='H29'){
              window.location.href = 'https://health29-dev.azurewebsites.net/';
            }

          }else{
            this.isloggedIn = false;
          }
          if(res.isFirstTime){
            isFirstTime = true;
          }
          this.setMessage(res.message);
          return {isloggedIn: this.isloggedIn, isFirstTime: isFirstTime} ;
          //return this.isloggedIn;
       }, (err) => {
         console.log(err);
         //this.isLoginFailed = true;
         this.setMessage("Login failed");
         this.isloggedIn = false;
         return {isloggedIn: this.isloggedIn, isFirstTime: false} ;
         //return this.isloggedIn;
       }
    );
  }

  async logout() {
    this.token = null;
    this.role = null;
    this.subrole = null;
    this.group = null;
    this.platform = null;
    this.expToken = null;
    this.isloggedIn = false;
    this.message = null;
    this.currentPatient = null;
    this.patientList = null;
    this.lang = sessionStorage.getItem('lang');
    localStorage.removeItem('token')
    //localStorage.removeItem('openlogin_store')

    var hideIntroLogins = localStorage.getItem('hideIntroLogins')
    //if(!this.getIsApp()){
      //sessionStorage.clear();
      //sessionStorage.setItem('lang', this.lang);
    //}
    //localStorage.clear();
    this.logout2();
    /*sessionStorage.clear();
    localStorage.clear();
    sessionStorage.setItem('lang', this.lang);
    localStorage.setItem('hideIntroLogins', hideIntroLogins);*/
    //await this.delay(500);
    this.router.navigate([this.getLoginUrl()]);
  }

  delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getToken() {
    return this.token;
  }

  isAuthenticated() {
    // here you can check if user is authenticated or not through his token
    return this.isloggedIn;
  }
  //este metodo sobraría si se usa el metodo signinUser
  setAuthenticated(token) {
    // here you can check if user is authenticated or not through his token
    this.isloggedIn=true;
    this.token=token;
  }
  getLoginUrl(): string {
		return this.loginUrl;
	}
  getRedirectUrl(): string {
		return this.redirectUrl;
	}
	setRedirectUrl(url: string): void {
		this.redirectUrl = url;
	}
  setMessage(message: string): void {
		this.message = message;
	}
  getMessage(): string {
		return this.message;
	}
  setRole(role: string): void {
    this.role = role;
  }
  getRole(): string {
    return this.role;
  }
  setSubRole(subrole: string): void {
    this.subrole = subrole;
  }
  getSubRole(): string {
    return this.subrole;
  }
  setGroup(group: string): void {
    this.group = group;
  }
  getGroup(): string {
    return this.group;
  }
  setExpToken(expToken: number): void {
    this.expToken = expToken;
  }
  getExpToken(): number {
    return this.expToken;
  }
  setIdUser(iduser: string): void {
    this.iduser = iduser;
  }
  getIdUser(): string {
    return this.iduser;
  }
  setCurrentPatient(currentPatient: ICurrentPatient): void {
    this.currentPatient = currentPatient;
  }
  getCurrentPatient(): ICurrentPatient {
    return this.currentPatient;
  }
  setPatientList(patientList: Array<ICurrentPatient>): void {
    this.patientList = patientList;
  }
  getPatientList(): Array<ICurrentPatient> {
    return this.patientList;
  }
  setLang(lang: string): void {
    this.lang = lang;
    sessionStorage.setItem('lang', this.lang);
  }
  getLang(): string {
    return this.lang;
  }

  setPlatform(platform: string): void {
    this.platform = platform;
    sessionStorage.setItem('platform', this.platform);
  }
  getPlatform(): string {
    return this.platform = null;;
  }
  getIsApp(): boolean {
    return this.isMobile ;
  }

}
