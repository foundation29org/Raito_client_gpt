import { Injectable, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpEvent, HttpInterceptor, HttpHandler, HttpRequest, HttpResponse, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs/Rx';
import 'rxjs/add/observable/throw'
import 'rxjs/add/operator/catch';

import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { environment } from 'environments/environment';

import { EventsService } from 'app/shared/services/events.service';
import { takeUntil } from 'rxjs/operators';
import * as decode from 'jwt-decode';


@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private inj: Injector, private router: Router) { }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    var eventsService = this.inj.get(EventsService);

    let authService = this.inj.get(AuthService); //authservice is an angular service
        // Get the auth header from the service.
    const Authorization = authService.getToken();
    if(authService.getToken()==undefined){
      const authReq = req.clone({ headers: req.headers});
      return next.handle(authReq)
    }
    // Clone the request to add the new header.
    var token =  authService.getToken();
    var type = 'Bearer'

    // Clone the request to add the new header.

    var isExternalReq = false;
    var authReq = req.clone({});
    //console.log(req.url);
    if(req.url.indexOf(environment.api)!==-1){
      /*const headers = new HttpHeaders({
        'authorization': `${type} ${token}`,
        'Cache-Control':  'no-cache, no-store, must-revalidate, post-check=0, pre-check=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      authReq = req.clone({ headers});*/
      authReq = req.clone({ headers: req.headers.set('authorization',  `${type} ${token}`) });
      let tokenService = this.inj.get(TokenService);
      if(!tokenService.isTokenValid()){
        authService.logout();
        //this.router.navigate([authService.getLoginUrl()]);
      }
    }

    if (req.url.indexOf(environment.f29bio) !== -1 || req.url.indexOf(environment.f29api) !== -1 || req.url.indexOf('https://clinicaltrials') !== -1 || req.url.indexOf('logic.azure.com') !== -1 || req.url.indexOf(environment.urlDxv2) !== -1 || req.url.indexOf('http://ipinfo.io') !== -1) {
      isExternalReq = true;
    }

    if (req.url.indexOf('/api/Document/Parse') !== -1) {
      isExternalReq = true;
      const headers = new HttpHeaders({
        'Content-Type': 'application/octet-stream'
      });
      authReq = req.clone({ headers });
    }

    if (req.url.indexOf('api.veriff.me/v1/sessions') !== -1) {
      isExternalReq = true;
      const headers = new HttpHeaders({
        'x-auth-client': environment.tokenVeriff
      });
      authReq = req.clone({ headers });
    }

    if (req.url.indexOf('/person') !== -1) {
      isExternalReq = true;
      authReq = req.clone();
    }

    if (req.url.indexOf('https://alchemy.veriff.com/api/v2/sessions') !== -1) {
      isExternalReq = true;
      /*const headers = new HttpHeaders({
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzZXNzaW9uX2lkIjoiMzZiYjllMTUtYTQ0NS00MGE5LWJlYWMtYmFlNDliNGVlNzI1IiwiaWF0IjoxNjQ3NTk3MDI1fQ.AplkUalQkKoPzvscBrZrWbDWjshmPToVyjs06C-MZV0'
      });
      authReq = req.clone({ headers });*/
    }

    /*if(req.url.indexOf('https://blobraitogpt.blob.core.windows.net')!==-1){
      isExternalReq = true;
      const headers = new HttpHeaders({
        'Access-Control-Allow-Origin':'*',
      });
      authReq = req.clone({ headers});//'Content-Type',  'application/json'
      //authReq = authReq.clone({ headers: req.headers.set('Content-Type',  'application/json' )});
    }*/

    // Pass on the cloned request instead of the original request.
    return next.handle(authReq)
      .catch((error, caught) => {
        if (error.status === 401 || error.status === 403) {
          authService.logout();
          return Observable.throw(error);
        }

        if (error.status === 404 || error.status === 0) {
          if (!isExternalReq) {
            var returnMessage = error.message;
            if (error.error.message) {
              returnMessage = error.error;
            }
            eventsService.broadcast('http-error', returnMessage);
          } else {
            eventsService.broadcast('http-error-external', 'no external conexion');

          }
          return Observable.throw(error);
        }

        if (error.status === 419) {
          return Observable.throw(error);
        }

        //return all others errors
        return Observable.throw(error);
      }) as any;
  }
}
