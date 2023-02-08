import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { environment } from 'environments/environment';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/of';
import 'rxjs/add/operator/toPromise';
import { SortService } from 'app/shared/services/sort.service';
import { catchError, debounceTime, distinctUntilChanged, map, tap, switchMap, merge, mergeMap, concatMap } from 'rxjs/operators'

@Injectable()
export class OpenAiService {
    constructor(private http: HttpClient, private sortService: SortService) {}

    postOpenAi(info){
      return this.http.post(environment.api + '/api/callopenai', info)
      .map((res: any) => {
        return res;
      }, (err) => {
        console.log(err);
        return err;
      })
    }

    parseResponse = (response: string): { symtoms: string[], drugs: string[], treatments: string[], diseases: string[], allergy: string[] } => {
      const lines = response.split('\n');
      let symtoms: string[] = [];
      let drugs: string[] = [];
      let treatments: string[] = [];
      let diseases: string[] = [];
      let allergy: string[] = [];
  
      for (const line of lines) {
        if (line.startsWith('Symptoms:')) {
          symtoms = line.substring('Symptoms:'.length).trim().split(', ');
        } else if (line.startsWith('Drugs:')) {
          drugs = line.substring('Drugs:'.length).trim().split(', ');
        } else if (line.startsWith('Treatments:')) {
          treatments = line.substring('Treatments:'.length).trim().split(', ');
        } else if (line.startsWith('Previous diseases or Conditions:')) {
          diseases = line.substring('Previous diseases or Conditions:'.length).trim().split(', ');
        } else if (line.startsWith('Allergies:')) {
          allergy = line.substring('Allergies:'.length).trim().split(', ');
        }
      }
      return { symtoms, drugs, treatments, diseases, allergy };
    };

    parseEntities(parsedResponse) {
      var posibleEntities = [];
      if(parsedResponse['symtoms'].length>0){
        for(let i=0; i<parsedResponse['symtoms'].length; i++){
          if(parsedResponse['symtoms'][i]!='no' && parsedResponse['symtoms'][i]!='No' && parsedResponse['symtoms'][i]!=''){
            posibleEntities.push({ name: parsedResponse['symtoms'][i], type: 'symptom', date: null, notes:''  })
          }
        }
      }
      if(parsedResponse['drugs'].length>0){
        for(let i=0; i<parsedResponse['drugs'].length; i++){
          if(parsedResponse['drugs'][i]!='no' && parsedResponse['drugs'][i]!='No' && parsedResponse['drugs'][i]!=''){
            posibleEntities.push({ name: parsedResponse['drugs'][i], type: 'drug', date: null, notes:''  })
          }
        }
      }
      if(parsedResponse['treatments'].length>0){
        for(let i=0; i<parsedResponse['treatments'].length; i++){
          if(parsedResponse['treatments'][i]!='no' && parsedResponse['treatments'][i]!='No' && parsedResponse['treatments'][i]!=''){
            posibleEntities.push({ name: parsedResponse['treatments'][i], type: 'treatment', date: null, notes:''  })
          }
        }
      }
      if(parsedResponse['diseases'].length>0){
        for(let i=0; i<parsedResponse['diseases'].length; i++){
          if(parsedResponse['diseases'][i]!='no' && parsedResponse['diseases'][i]!='No' && parsedResponse['diseases'][i]!=''){
            posibleEntities.push({ name: parsedResponse['diseases'][i], type: 'disease', date: null, notes:''  })
          }
        }
      }
      if(parsedResponse['allergy'].length>0){
        for(let i=0; i<parsedResponse['allergy'].length; i++){
          if(parsedResponse['allergy'][i]!='no' && parsedResponse['allergy'][i]!='No' && parsedResponse['allergy'][i]!=''){
            posibleEntities.push({ name: parsedResponse['allergy'][i], type: 'allergy', date: null, notes:'' })
          }
        }
      }
      console.log(posibleEntities)
      return posibleEntities;
    }


}
