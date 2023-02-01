import { Injectable, EventEmitter, Output } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';

declare var AzureStorage: any;

export interface IBlobAccessToken {
  blobAccountUrl: string;
  sasToken: string;
  containerName: string;
  patientId: string;
}

@Injectable()
export class BlobStorageService {
  @Output() change: EventEmitter<boolean> = new EventEmitter();
  @Output() changeFilesBlob: EventEmitter<any> = new EventEmitter();
  @Output() changeFilesExomizerBlob: EventEmitter<any> = new EventEmitter();
  @Output() changeFilesExomizerBlobVcf: EventEmitter<any> = new EventEmitter();
  @Output() changeFilesOnlyVcf: EventEmitter<any> = new EventEmitter();
  @Output() changeFilesHtmlExomiserBlob: EventEmitter<any> = new EventEmitter();
  @Output() changeFilesMapBlob: EventEmitter<any> = new EventEmitter();
  @Output() changeFilesPatientBlob: EventEmitter<any> = new EventEmitter();
  @Output() changeNcrFilesPatientBlob: EventEmitter<any> = new EventEmitter();

  private finishedOrError = false;
  uploaded = false;
  filesOnBlob: any = [];
  filesMapOnBlob: any = [];
  vcfFilesOnBlob: any = [];

  blobService: any;

  init(accessToken: IBlobAccessToken){
    const blobUri = accessToken.blobAccountUrl;
    this.blobService = AzureStorage
      .createBlobServiceWithSas(blobUri, accessToken.sasToken)
      .withFilter(new AzureStorage.ExponentialRetryPolicyFilter());
  }

  uploadToBlobStorage(accessToken: IBlobAccessToken, file: File, filename: string, section: string): Observable<number> {
    const progress$ = new Subject<number>();
    const speedSummary = this.uploadFile(accessToken, file, filename, section, progress$);

    this.refreshProgress(speedSummary, progress$);

    return progress$.asObservable();
  }

  createContainerIfNotExists(accessToken: IBlobAccessToken, section: string){

      if(section=='patientGenoFiles'){
        this.loadPatientGenoFiles(accessToken.containerName);
      }else{
        this.loadFilesOnBlob(accessToken.containerName);
      }
  }

  private uploadFile(accessToken: IBlobAccessToken, file: File, filename: string, section: string, progress$: Subject<number>): any {
    this.uploaded = false;
    const customBlockSize = file.size > 1024 * 1024 * 32 ? 1024 * 1024 * 4 : 1024 * 512;
    const blobUri = accessToken.blobAccountUrl;
    this.blobService = AzureStorage
      .createBlobServiceWithSas(blobUri, accessToken.sasToken)
      .withFilter(new AzureStorage.ExponentialRetryPolicyFilter());

    this.blobService.singleBlobPutThresholdInBytes = customBlockSize;
    var metadata = {
        category: 'Raito',
        type: 'sample'
    }
    var extension = filename.substr(filename.lastIndexOf('.'));
    var pos = (filename).lastIndexOf('.')
    pos=pos-4;
    if(pos>0 && extension == '.gz'){
      extension = (filename).substr(pos);
    }
    var fileNameToSave=filename;
    if(extension=='.vcf' || extension=='.vcf.gz'){
      var now = new Date();
      var y = now.getFullYear();
      var m = now.getMonth() + 1;
      var d = now.getDate();
      var date='' + y + (m < 10 ? '0' : '') + m + (d < 10 ? '0' : '') + d;
      fileNameToSave='vcf/'+date+'/'+filename;
    }
    if(fileNameToSave.indexOf("relatedConditions")>-1){
      var now = new Date();
      var y = now.getFullYear();
      var m = now.getMonth() + 1;
      var d = now.getDate();
      var h = now.getHours();
      var mm = now.getMinutes();
      var date='' + y + (m < 10 ? '0' : '') + m + (d < 10 ? '0' : '') + d + h + mm;
      fileNameToSave='results/'+date+'/'+fileNameToSave
    }
    return this.blobService.createBlockBlobFromBrowserFile(
      accessToken.containerName,
      fileNameToSave,
      file,
      { blockSize: customBlockSize, metadata: metadata },
      this.callback(filename, section, progress$, accessToken)
    );
  }

  private refreshProgress(speedSummary: any, progress$: Subject<number>): void {
    setTimeout(() => {
      if (!this.uploaded) {
        const progress = speedSummary.getCompletePercent();
        progress$.next(progress);
        this.refreshProgress(speedSummary, progress$);
      }
    }, 200);
  }

  private callback(filename: string, section: string, progress$: Subject<number>, accessToken: IBlobAccessToken): (error, result, response) => void {
    return (error, result, response) => {
      this.finishedOrError = true;
      if (error) {
        progress$.error('Error uploading to blob storage: ' + JSON.stringify(accessToken));
        this.uploaded = false;
      } else {
        progress$.next(100);
        progress$.complete();
        //call to nodejs for call microsoft genomics
        this.uploaded = true;
        this.change.emit(this.uploaded);
        if(section=='ncrOrigenfile' || section=='ncrInfofile'){
          console.log("file ncr upload")
          this.loadNcrResultsFilesPatientBlob(accessToken.containerName);
        }else if(section=='patientGenoFiles'){
          this.loadPatientGenoFiles(accessToken.containerName);
        }else if(section=='vcfonly'){
          this.loadFilesVCF(accessToken.containerName);
        }else{
          this.loadFilesOnBlob(accessToken.containerName);
        }

      }
    };
  }

  loadFilesOnBlob(containerName){
   this.filesOnBlob = [];
    this.blobService.listBlobsSegmented(containerName, null, {
      publicAccessLevel: 'blob'
    }, function(error, result, response) {
      if (!error) {
        var filesgeno = [];
        for (var i = 0; i < result.entries.length; i++) {
          if((result.entries[i].name).indexOf('medicalcare')==-1){
            filesgeno.push(result.entries[i]);
          }
        }
        this.filesOnBlob = filesgeno;
        this.changeFilesBlob.emit(this.filesOnBlob);
        //this.changeFilesMapBlob.emit(this.filesOnBlob);
        // if result = true, container was created.
        // if result = false, container already existed.
      }
    }.bind(this));
  }

  loadFilesVCF(containerName){
   this.vcfFilesOnBlob = [];
   var patternFileNameVcf='vcf/';
    this.blobService.listBlobsSegmented(containerName, null, {
      publicAccessLevel: 'blob'
    }, function(error, result, response) {
      if (!error) {
        var filesgeno = [];
        var filesgenovcf = [];
        for (var i = 0; i < result.entries.length; i++) {
          if(result.entries[i].name.indexOf(patternFileNameVcf)!=-1){
            if((result.entries[i].name).indexOf('.vcf')!=-1){
              var extension1 = (result.entries[i].name).substr((result.entries[i].name).lastIndexOf('.'));
              var pos = (result.entries[i].name).lastIndexOf('.')
              pos=pos-4;
              if(pos>0 && extension1 == '.gz'){
                extension1 = (result.entries[i].name).substr(pos);
              }
              if(extension1 == '.vcf' || extension1 == '.vcf.gz'){
                filesgenovcf.push(result.entries[i]);
              }
            }
          }
        }
        this.vcfFilesOnBlob = filesgenovcf;
        this.changeFilesOnlyVcf.emit(this.vcfFilesOnBlob);
      }
    }.bind(this));
  }

  loadPatientGenoFiles(containerName){
   this.vcfFilesOnBlob = [];
   var patternFileNameVcf='vcf/';

    this.blobService.listBlobsSegmented(containerName, null, {
      publicAccessLevel: 'blob'
    }, function(error, result, response) {
      if (!error) {
        var filesgenovcf = [];
        for (var i = 0; i < result.entries.length; i++) {
          if(((result.entries[i].name).indexOf('.vcf')!=-1 && result.entries[i].name.indexOf(patternFileNameVcf)!=-1) || (result.entries[i].name).indexOf('raitofile/')!=-1){
            if((result.entries[i].name).indexOf('raitofile/')!=-1){
              filesgenovcf.push(result.entries[i]);
            }else{
              var extension1 = (result.entries[i].name).substr((result.entries[i].name).lastIndexOf('.'));
              var pos = (result.entries[i].name).lastIndexOf('.')
              pos=pos-4;
              if(pos>0 && extension1 == '.gz'){
                extension1 = (result.entries[i].name).substr(pos);
              }
              if(extension1 == '.vcf' || extension1 == '.vcf.gz'){
                filesgenovcf.push(result.entries[i]);
              }
            }
          }
        }
        this.vcfFilesOnBlob = filesgenovcf;
        this.changeFilesExomizerBlobVcf.emit(this.vcfFilesOnBlob);
        // if result = true, container was created.
        // if result = false, container already existed.
      }
    }.bind(this));
  }

  deleteBlob(containerName, blobName){
    this.blobService.deleteBlob(containerName, blobName, {
      publicAccessLevel: 'blob'
    }, function(error, result, response) {
      if (!error) {
        this.loadFilesOnBlob(containerName);
        // if result = true, container was created.
        // if result = false, container already existed.
      }
    }.bind(this));
  }

  deleteBlobAndLoadVCF(containerName, blobName){
    this.blobService.deleteBlob(containerName, blobName, {
      publicAccessLevel: 'blob'
    }, function(error, result, response) {
      if (!error) {
        this.loadFilesOnBlob(containerName);
        this.loadFilesVCF(containerName);
        // if result = true, container was created.
        // if result = false, container already existed.
      }
    }.bind(this));
  }

  deleteContainerIfExists(accessToken: IBlobAccessToken){
    const blobUri = accessToken.blobAccountUrl;
    this.blobService = AzureStorage
      .createBlobServiceWithSas(blobUri, accessToken.sasToken)
      .withFilter(new AzureStorage.ExponentialRetryPolicyFilter());
      this.blobService.deleteContainerIfExists(accessToken.containerName, {
        publicAccessLevel: 'blob'
      }, function(error, result, response) {
        if (!error) {
        }
      }.bind(this));
  }

  loadFilesPatientBlob(containerName){
    this.blobService.listBlobsSegmented(containerName, null, {
      publicAccessLevel: 'blob'
    }, function(error, result, response) {
      if (!error) {
        var fileshtml = [];
        for (var i = 0; i < result.entries.length; i++) {
          var temfile = (result.entries[i].name);
          if(temfile.indexOf('textanaresult.json')!=-1 || temfile.indexOf('.docx')!=-1 || temfile.indexOf('.pdf')!=-1 || temfile.indexOf('.html')!=-1 || temfile.indexOf('.vcf')!=-1 || temfile.indexOf('.vcf.gz')!=-1 || temfile.indexOf('.jpg')!=-1 || temfile.indexOf('.png')!=-1 || temfile.indexOf('.gif')!=-1 || temfile.indexOf('.tiff')!=-1 || temfile.indexOf('.tif')!=-1 || temfile.indexOf('.bmp')!=-1 || temfile.indexOf('.dib')!=-1 || temfile.indexOf('.bpg')!=-1 || temfile.indexOf('.psd')!=-1 || temfile.indexOf('.jpeg')!=-1 || temfile.indexOf('.jpe')!=-1 || temfile.indexOf('.jfif')!=-1){
            if((result.entries[i].name).indexOf('textanaresult.json')!=-1){
              result.entries[i].ncrresult = true;
            }
            fileshtml.push(result.entries[i]);
          }
        }
        this.changeFilesPatientBlob.emit(fileshtml);
      }
    }.bind(this));
  }

  loadNcrResultsFilesPatientBlob(containerName){
    this.blobService.listBlobsSegmented(containerName, null, {
      publicAccessLevel: 'blob'
    }, function(error, result, response) {
      if (!error) {
        var filesncr = [];
        for (var i = 0; i < result.entries.length; i++) {
          var temfile = (result.entries[i].name);
          if(temfile.indexOf('textanaresult.json')!=-1 ){
            if((result.entries[i].name).indexOf('textanaresult.json')!=-1){
              result.entries[i].ncrresult = true;
            }
            filesncr.push(result.entries[i]);
          }
        }
        this.changeNcrFilesPatientBlob.emit(filesncr);
      }
    }.bind(this));
  }

}
