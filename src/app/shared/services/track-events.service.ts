import { Injectable } from '@angular/core';
declare let gtag: any;

@Injectable()
export class TrackEventsService {
  _startTime: any;
  constructor() {
    console.log(sessionStorage.getItem('uuid'));
    this._startTime = Date.now();
  }

  lauchEvent(category) {
    var secs = this.getElapsedSeconds();
    gtag('event', category, { 'myuuid': sessionStorage.getItem('uuid'), 'event_label': secs });
  }

  getElapsedSeconds() {
    var endDate = Date.now();
    var seconds = (endDate - this._startTime) / 1000;
    return seconds;
  };

  delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

}
