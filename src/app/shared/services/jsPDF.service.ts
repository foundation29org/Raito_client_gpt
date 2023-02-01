import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { DatePipe } from '@angular/common';

import { jsPDF } from "jspdf";
import 'jspdf-autotable';
import { UserOptions } from 'jspdf-autotable';
import { axisBottom } from 'd3-axis';

interface jsPDFWithPlugin extends jsPDF {
  autoTable: (options: UserOptions) => jsPDF;
}

@Injectable()
export class jsPDFService {
    constructor(public translate: TranslateService, private datePipe: DatePipe) {
    }
    lang: string = '';
    meses: any = {
        "enero": "January",
        "febrero": "February",
        "marzo": "March",
        "abril": "April",
        "mayo": "May",
        "junio": "June",
        "julio": "July",
        "agosto": "August",
        "septiembre": "September",
        "octubre": "October",
        "noviembre": "November",
        "diciembre": "December"
    };
    

    generateTimelinePDF(lang, dictionaryTimeline, listSymptomsNullInfo, disease, topRelatedConditions, save){
        this.lang = lang;
        var doc = new jsPDF as jsPDFWithPlugin;
        var positionY = 0;
        const marginX = 5;
        
        const pdfPageWidth = doc.internal.pageSize.getWidth() - 2 * marginX;
        const pdfPageHeight = doc.internal.pageSize.getHeight()

        // Cabecera inicial
        var img_logo = new Image();
        img_logo.src = "assets/img/logo.png"
        doc.addImage(img_logo, 'png', 20, 10, 29, 17);
        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        var actualDate = new Date();
        var dateHeader = this.getFormatDate(actualDate);
        if(lang=='es'){
            this.writeHeader(doc, 89, 2, this.translate.instant("land.diagnosed.timeline.RegDate"));
            this.writeDataHeader(doc, 82, 7, dateHeader);
        }else{
            this.writeHeader(doc, 93, 2, this.translate.instant("land.diagnosed.timeline.RegDate"));
            this.writeDataHeader(doc, 88, 7, dateHeader);
        }

        //Add QR
        /*var img_qr = new Image();
        img_qr.src = "assets/img/elements/qr.png"
        doc.addImage(img_qr, 'png', 160, 5, 32, 30);*/

        this.newHeatherAndFooter(doc);
        positionY += 25;

        doc.setFont(undefined, 'bold');
        doc.setFontSize(15);
        doc.text(this.translate.instant("land.diagnosed.timeline.Report"), 10, positionY+= 15);
        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);
        doc.setTextColor(117, 120, 125)
        doc.setFillColor(255, 255, 255);
        if(lang=='es'){
            doc.rect(8, positionY+5, 192, 38, 'FD'); //Fill and Border
        }else{
            doc.rect(8, positionY+5, 181, 38, 'FD'); //Fill and Border
        }
        doc.text(this.translate.instant("land.diagnosed.timeline.subtitlea"), 10, positionY += 10)
        doc.text(this.translate.instant("land.diagnosed.timeline.subtitleb"), 10, positionY += 5)
        doc.text(this.translate.instant("land.diagnosed.timeline.subtitlec"), 10, positionY += 5)
        positionY += 5
        doc.text(this.translate.instant("land.diagnosed.timeline.subtitle1"), 10, positionY += 5)
        doc.text(this.translate.instant("land.diagnosed.timeline.subtitle2"), 10, positionY += 5)
        doc.text(this.translate.instant("land.diagnosed.timeline.subtitle3"), 10, positionY += 5)
        doc.setTextColor(0, 0, 0)
        doc.setFontSize(10);
        positionY += 5
        if(disease.id!=undefined){
            positionY += 10
            //doc.setFontSize(15);
            positionY = this.checkIfNewPage(doc, positionY);
            this.newSectionDoc(doc,this.translate.instant("diagnosis.Previous Diagnosis"),'',null,positionY)
            positionY = this.checkIfNewPage(doc, positionY);
            //doc.text(this.translate.instant("diagnosis.Previous Diagnosis"), 10, positionY += 5)
            positionY += 7
            //doc.setFontSize(10);
            positionY = this.writeText(doc, 16, positionY, disease.name);
            positionY = this.writeLinkOrpha(doc, (disease.name.length*2)+16, positionY, (disease.id).toUpperCase());
            doc.setFontSize(9);
            doc.setTextColor(117, 120, 125)
            var chunkDescr= this.chunkSubstr(disease.desc, 120)
            for (var i = 0; i < chunkDescr.length; i++) {
                if(chunkDescr[i+1]!=undefined){
                    if(chunkDescr[i+1].charAt(0)!=' '){
                        doc.text(chunkDescr[i]+"-", 16, positionY+= 5);
                    }else{
                        doc.text(chunkDescr[i], 16, positionY+= 5);
                    }
                }else{
                    doc.text(chunkDescr[i], 16, positionY+= 5);
                }
                
                //positionY = this.writeText(doc, 16, positionY+= 5, chunkDescr[i]);
            }
            doc.setTextColor(0, 0, 0)
            doc.setFontSize(10);
        }else{
            //topRelatedConditions
            //Diseases
            if(topRelatedConditions.length>0){
                positionY = this.checkIfNewPage(doc, positionY);
                this.newSectionDoc(doc,this.translate.instant("diagnosis.Candidate diagnosis"),'',null,positionY += 10)
                positionY = this.checkIfNewPage(doc, positionY);
                this.writeHeaderText(doc, 16, positionY += 7, this.translate.instant("generics.Name"));
                this.writeHeaderText(doc, 175, positionY, "Id");
                positionY += 7;
                for (var i = 0; i < topRelatedConditions.length; i++) {
                    if(topRelatedConditions[i].name.length>99){
                        positionY = this.writeText(doc, 16, positionY, topRelatedConditions[i].name.substr(0,99));
                        positionY = this.writeLinkOrpha(doc, 175, positionY, (topRelatedConditions[i].id).toUpperCase());
                        positionY = positionY+5;
                        positionY = this.writeText(doc, 16, positionY, topRelatedConditions[i].name.substr(100));
                    }else{
                        positionY = this.writeText(doc, 16, positionY, topRelatedConditions[i].name);
                        positionY = this.writeLinkOrpha(doc, 175, positionY, (topRelatedConditions[i].id).toUpperCase());
                    }
                    positionY += 7;
                }
            }
        }
        
        
        positionY += 10;
        positionY = this.timelineTable(doc,positionY,dictionaryTimeline, listSymptomsNullInfo);

        doc.setDrawColor(222,226,230);
        if(listSymptomsNullInfo.length>0){
            positionY += 10;
        }else{
            positionY += 5;
        }
        positionY = this.checkIfNewPage(doc, positionY);
        this.newSectionDoc(doc,this.translate.instant("land.diagnosed.timeline.Graphic chronology"),'',null,positionY);
        positionY = this.checkIfNewPage(doc, positionY);
        positionY = this.drawTimeLine(doc,dictionaryTimeline, listSymptomsNullInfo, positionY-= 10);

        positionY += 10;
        this.writeAboutUs(doc, positionY);
        

        var pageCount = doc.internal.pages.length; //Total Page Number
        pageCount = pageCount-1;
        for (var i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            //footer page
            doc.text(this.translate.instant("land.page")+ ' ' + i + '/' + pageCount, 97, 290);
        }
        
        var date = this.getDate();
        if(save){
            doc.save('Raito_Timeline_' + date +'.pdf');
            return;
        }else{
            var pdfBase64 = doc.output('datauristring');
            return pdfBase64;
        }
    }

    private chunkSubstr(str, size) {
        const numChunks = Math.ceil(str.length / size)
        const chunks = new Array(numChunks)
      
        for (let i = 0, o = 0; i < numChunks; ++i, o += size) {
          chunks[i] = str.substr(o, size)
        }
      
        return chunks
      }

    private drawTimeLine(doc, dictionaryTimeline, listSymptomsNullInfo, posY){
        //draw dictionaryTimeline
        var positionY = posY;
        if(dictionaryTimeline!=undefined){
            var listItemDateKeys = Object.keys(dictionaryTimeline).sort((a,b)=>{return this.keyDescOrder(a,b)})
            for (var itemDateIndex in listItemDateKeys){
                var itemDate = listItemDateKeys[itemDateIndex]
                positionY = this.drawLabelTimeLine(doc, itemDate, positionY);
                var listDateKeys= Object.keys(dictionaryTimeline[itemDate]).sort((a,b)=>{return this.valueDateDescOrder(a,b)})
                for (var dateIndex in listDateKeys){
                    var date = listDateKeys[dateIndex]
                    var lineHeight = (5*(dictionaryTimeline[itemDate][date].length)+45)+positionY;
                    doc.line(15, positionY-10, 15, lineHeight);
                    positionY = this.drawBoxTimeLine(doc, dictionaryTimeline[itemDate][date], date, positionY);
                }
            }
        }
        if(listSymptomsNullInfo!=undefined){
            if(listSymptomsNullInfo.length>0){
                positionY = this.drawListSymptomsNullInfo(doc, listSymptomsNullInfo, positionY);
            }
        }
        return positionY;
    }

    private drawLabelTimeLine(doc, itemDate, positionY){
        var posInit = positionY;
        positionY = this.checkIfNewPage2(doc, positionY+20);
        if(positionY!=20){
            positionY =posInit;
        }else{
            posInit = positionY;
        }
        doc.setFillColor(0,157,160);
        doc.rect(15, positionY += 15, (itemDate.length*2)+3, 7, 'FD'); //Fill and Border
        doc.setTextColor(255, 255, 255);
        doc.setFont(undefined, 'bold');
        doc.setFontSize(10);
        
        doc.text(itemDate, 17, posInit += 20);
        positionY += 10;
        doc.setTextColor(0, 0, 0)
        return positionY;
    }

    private drawBoxTimeLine(doc, dateinfo,date, positionY){
        var posInit = positionY;
        var posiblePos = positionY+((5*(dateinfo.length)+10));
        if(posiblePos<270){
            positionY = this.checkIfNewPage2(doc, posiblePos);
            if(positionY!=20){
                positionY =posInit;
            }else{
                posInit = positionY;
            }
        }else{
            positionY =posInit;
        }
        positionY = this.checkIfNewPage2(doc, positionY);
        if(positionY == 20){
            posInit = positionY;
        }
        var calendarIcon = new Image();
        calendarIcon.src = "assets/img/pdf/ft-calendar.png"
        doc.addImage(calendarIcon, 'png', 15, (positionY+4), 7, 7);
        
        doc.setFillColor(255, 255, 255);
        var heightRect = (5*(dateinfo.length)+8);
        /*if(heightRect+positionY>235){
            heightRect = (235-(posInit))+35;
        }*/
        if(posInit+10<270){
            if(heightRect+positionY>235){
                if(heightRect<33){
                    //heightRect = (235-(posInit))+10;
                }else{
                    heightRect = (235-(posInit))+35;
                }
                
            }
        }else{
            heightRect = 10;
        }
        
        doc.rect(25, (positionY+4), 150, heightRect, 'FD'); //Fill and Border
        doc.setTextColor(0, 0, 0)
        doc.setFont(undefined, 'bold');
        doc.setFontSize(10);
        /*doc.text(date, 30, posInit += 10);
        doc.line(30, posInit+1, 170, posInit+1);*/
        posInit= posInit+6;
        for (var i=0;i<dateinfo.length;i++){
            posInit = this.checkIfNewPage(doc, posInit);
            if(posInit==20){
                //is new page
                doc.setFillColor(255, 255, 255);
                var heightRect2 = ((5*(dateinfo.length-i)+10)-5);
                doc.rect(25, (posInit+4), 150, heightRect2, 'FD'); //Fill and Border
                doc.setTextColor(0, 0, 0)
                posInit= posInit+5;
                doc.setFont(undefined, 'bold');
                var lineHeight = (5*(dateinfo.length-i)+12)+posInit;
                doc.line(15, 20, 15, lineHeight);
            }
            var url = "https://hpo.jax.org/app/browse/term/" + dateinfo[i].id;
            doc.setTextColor(51, 101, 138);
            doc.textWithLink(dateinfo[i].name, 30, posInit+= 5, { url: url });
        }
        doc.setTextColor(0, 0, 0)
        //doc.text(date, 15, positionY += 20);
        positionY= posInit+ 5;
        return positionY;
    }

    private drawListSymptomsNullInfo(doc, listSymptomsNullInfo, positionY){
        var posInit = positionY;
        positionY = this.checkIfNewPage2(doc, positionY+20);
        if(positionY!=20){
            positionY =posInit;
        }else{
            positionY-= 15;
            posInit = positionY;
        }
        doc.setFillColor(0,157,160);
        doc.rect(15, positionY += 15, 53, 7, 'FD'); //Fill and Border
        doc.setTextColor(255, 255, 255);
        doc.setFont(undefined, 'bold');
        doc.setFontSize(10);
        positionY = this.checkIfNewPage(doc, positionY);
        doc.text(this.translate.instant("land.diagnosed.symptoms.NoOnset"), 17, posInit += 20);
        positionY += 10;
        doc.setTextColor(0, 0, 0);
        var calendarIcon = new Image();
        calendarIcon.src = "assets/img/pdf/ft-help.png"
        doc.addImage(calendarIcon, 'png', 15, (positionY+4), 7, 7);
        doc.setFillColor(255, 255, 255);
        var heightRect = (5*(listSymptomsNullInfo.length)+5);
        if(heightRect+positionY>235){
            if(heightRect<33){
                //heightRect = (235-(posInit))+10;
            }else{
                heightRect = (235-(posInit))+35;
            }
            
        }
        /*if(heightRect+positionY>235){
            if(heightRect<33){
                heightRect = (235-(posInit))+10;
            }else{
                heightRect = (235-(posInit))+33;
            }
        }
        if(heightRect>250){
            heightRect = 250;
        }else if(heightRect<10){
            heightRect = 10;
        }*/
        doc.rect(25, (positionY+4), 150, heightRect, 'FD'); //Fill and Border
        doc.setTextColor(0, 0, 0)
        posInit= posInit+10;
        for (var i=0;i<listSymptomsNullInfo.length;i++){
            posInit = this.checkIfNewPage(doc, posInit);
            if(posInit==20){
                //is new page
                doc.setFillColor(255, 255, 255);
                var heightRect2 = ((5*(listSymptomsNullInfo.length-i)+5));
                if(heightRect2>250){
                    heightRect2 = 250;
                }else if(heightRect2<10){
                    heightRect2 = 10;
                }
                doc.rect(25, (posInit+4), 150, heightRect2, 'FD'); //Fill and Border
                doc.setTextColor(0, 0, 0)
                posInit= posInit+5;
                doc.setFont(undefined, 'bold');
            }
            var url = "https://hpo.jax.org/app/browse/term/" + listSymptomsNullInfo[i].id;
            doc.setTextColor(51, 101, 138);
            doc.textWithLink(listSymptomsNullInfo[i].name, 30, posInit+= 5, { url: url });
        }
        doc.setTextColor(0, 0, 0)
        //doc.text(date, 15, positionY += 20);
        positionY= posInit+ 5;
        return positionY;
    }

    private timelineTable(doc,positionY,dictionaryTimeline, listSymptomsNullInfo){
        positionY = this.checkIfNewPage(doc, positionY);
        this.newSectionDoc(doc,this.translate.instant("land.diagnosed.timeline.Symptoms"),this.translate.instant("land.diagnosed.timeline.Appendix1Title"),null,positionY)
        positionY = this.checkIfNewPage(doc, positionY);
        doc.setTextColor(117, 120, 125)
        doc.setFontSize(9);
        doc.text(this.translate.instant("land.diagnosed.timeline.Knowing the evolution1"), 16, positionY += 5);
        doc.text(this.translate.instant("land.diagnosed.timeline.Knowing the evolution2"), 16, positionY += 5);
        doc.setTextColor(0, 0, 0)
        doc.setFontSize(10);
        positionY+=2;
        if(dictionaryTimeline!=undefined){
            var listItemDateKeys = Object.keys(dictionaryTimeline).sort((a,b)=>{return this.keyDescOrder(a,b)})
            if(listItemDateKeys.length>0){
                var bodyTable = []
                var notesBodyTable={};
                var listItemDateKeys = Object.keys(dictionaryTimeline).sort((a,b)=>{return this.keyDescOrder(a,b)})
                for (var itemDateIndex in listItemDateKeys){
                    var itemDate = listItemDateKeys[itemDateIndex]
                    var listDateKeys= Object.keys(dictionaryTimeline[itemDate]).sort((a,b)=>{return this.valueDateDescOrder(a,b)})
                    for (var dateIndex in listDateKeys){
                        var date= listDateKeys[dateIndex]
                        for (var i=0;i<dictionaryTimeline[itemDate][date].length;i++){
                            var name = dictionaryTimeline[itemDate][date][i].name
                            if(name==undefined){
                                name = dictionaryTimeline[itemDate][date][i].id + "-" + this.translate.instant("phenotype.Deprecated")
                            }
                            var id = dictionaryTimeline[itemDate][date][i].id
                            var onsetdate = "-"
                            if((dictionaryTimeline[itemDate][date][i].onsetdate!=undefined)&&(dictionaryTimeline[itemDate][date][i].onsetdate!=null)){
                                onsetdate=this.datePipe.transform(dictionaryTimeline[itemDate][date][i].onsetdate, 'MMM y',this.translate.currentLang)
                            }
                            var finishdate = "-"
                            if((dictionaryTimeline[itemDate][date][i].finishdate!=undefined)&&(dictionaryTimeline[itemDate][date][i].finishdate!=null)){
                                finishdate=this.datePipe.transform(dictionaryTimeline[itemDate][date][i].finishdate, 'MMM y',this.translate.currentLang)
                            }
                            var duration="-"
                            if(((onsetdate!="-")&&(finishdate!="-"))){
                                duration = this.dateDiff(dictionaryTimeline[itemDate][date][i].onsetdate,dictionaryTimeline[itemDate][date][i].finishdate)
                            }
                            else if((onsetdate!="-")&&(dictionaryTimeline[itemDate][date][i].isCurrentSymptom)){
                                duration = this.dateDiff(dictionaryTimeline[itemDate][date][i].onsetdate,new Date())
                            }
                            var notes = null;
                            if((dictionaryTimeline[itemDate][date][i].notes!=null)&&(dictionaryTimeline[itemDate][date][i].notes!=undefined)){
                                notes = dictionaryTimeline[itemDate][date][i].notes
                            }
    
                            var symptom = [{content:name,colSpan:1,styles:{fontSize:10, fontStyle: 'normal'}},{content:duration,colSpan:1,styles:{fontSize:10, fontStyle: 'normal'}},{content:onsetdate,colSpan:1,styles:{fontSize:10, fontStyle: 'normal'}},{content:finishdate,colSpan:1,styles:{fontSize:10, fontStyle: 'normal'}},{content:id,colSpan:1,styles:{fontSize:10, fontStyle: 'normal'}}]
                            var foundInBodyTable = false;
                            for(var j=0;j<bodyTable.length;j++){
                                for (var k=0;k< bodyTable[j].length;k++){
                                    if(bodyTable[j][k].content == (id)){
                                        foundInBodyTable=true
                                    }
                                } 
                            }
                            if(!foundInBodyTable){
                                bodyTable.push(symptom)
                                if(notes!=null){
                                    notesBodyTable[id]=notes;
                                }
                            }
                        }
                    }
                }
                // Add notes 
                for(var i = 0; i < bodyTable.length; i++){
                    for(var j=0; j< bodyTable[i].length;j++){
                        if(Object.keys(notesBodyTable).includes(bodyTable[i][j].content)){
                            bodyTable.splice(i+1,0,[{content:"\t"+ notesBodyTable[bodyTable[i][j].content],colSpan:5,styles:{fontSize:9, fontStyle: 'italic'}}])
                        }
                    }
                }
    
                let tableInfo  = null; 
                doc.autoTable({
                    columnStyles: {
                        0: {cellWidth: 90},
                        1: {cellWidth: 20},
                        2: {cellWidth: 20},
                        3: {cellWidth: 20},
                        4: {cellWidth: 30},
                        // etc
                      },
                    head: [[this.translate.instant("generics.Name"),this.translate.instant("land.diagnosed.timeline.Duration"),this.translate.instant("generics.Start Date"), this.translate.instant("generics.End Date"),"ID"]],
                    body: bodyTable,
                    startY: positionY,
                    theme: 'plain',
                    didDrawPage: ()=>{
                        this.newHeatherAndFooter(doc);
                    },
                    willDrawCell:(data)=>{
                        if (data.cell.section === 'body' && data.column.index === 4) {
                            var text = data.cell.text.toString()
                            data.cell.text = ""
                            doc.setTextColor(51, 101, 138)
                            var url = "https://hpo.jax.org/app/browse/term/" + text;
                            doc.textWithLink(text, (data.cell.x+data.cell.styles.cellPadding), (data.cell.y+3*+data.cell.styles.cellPadding), { url: url });
                        }
                    },
                    didParseCell: (data)=>{
                        if(!tableInfo){
                            tableInfo=data.table;
                        }
                    }
                    
                }); 
                positionY = tableInfo.finalY;
            }
        }
        
        if(listSymptomsNullInfo.length>0){
            var bodyTable2 = []
            var notesBodyTable2={};

            for(var j=0;j<listSymptomsNullInfo.length;j++){

                var name2 = listSymptomsNullInfo[j].name
                if(name2==undefined){
                    name2 = listSymptomsNullInfo[j].id + "-" + this.translate.instant("phenotype.Deprecated")
                }
                var id2 = listSymptomsNullInfo[j].id
                
                var notes2 = null;
                if((listSymptomsNullInfo[j].notes!=null)&&(listSymptomsNullInfo[j].notes!=undefined)){
                    notes2 = listSymptomsNullInfo[j].notes
                }
                var symptom2 = [{content:name2,colSpan:1,styles:{fontSize:10, fontStyle: 'normal'}},{content:id2,colSpan:1,styles:{fontSize:10, fontStyle: 'normal'}}]
                if(dictionaryTimeline!=undefined){
                    var listItemDateKeys = Object.keys(dictionaryTimeline).sort((a,b)=>{return this.keyDescOrder(a,b)})
                    if(listItemDateKeys.length>0){
                        symptom2 = [{content:name2,colSpan:1,styles:{fontSize:10, fontStyle: 'normal'}},{content:'-',colSpan:1,styles:{fontSize:10, fontStyle: 'normal'}},{content:'-',colSpan:1,styles:{fontSize:10, fontStyle: 'normal'}},{content:'-',colSpan:1,styles:{fontSize:10, fontStyle: 'normal'}},{content:id2,colSpan:1,styles:{fontSize:10, fontStyle: 'normal'}}]
                    }
                }
                
                var foundInBodyTable2 = false;
                for(var j=0;j<bodyTable2.length;j++){
                    for (var k=0;k< bodyTable2[j].length;k++){
                        if(bodyTable2[j][k].content == (id)){
                            foundInBodyTable2=true
                        }
                    } 
                }
                if(!foundInBodyTable2){
                    bodyTable2.push(symptom2)
                    if(notes2!=null){
                        notesBodyTable2[id2]=notes2;
                    }
                }
            }

            // Add notes 
            for(var i = 0; i < bodyTable2.length; i++){
                for(var j=0; j< bodyTable2[i].length;j++){
                    if(Object.keys(notesBodyTable2).includes(bodyTable2[i][j].content)){
                        bodyTable2.splice(i+1,0,[{content:"\t"+ notesBodyTable2[bodyTable2[i][j].content],colSpan:5,styles:{fontSize:9, fontStyle: 'italic'}}])
                    }
                }
            }

            let tableInfo2  = null; 

            if(dictionaryTimeline!=undefined){
                var listItemDateKeys = Object.keys(dictionaryTimeline).sort((a,b)=>{return this.keyDescOrder(a,b)})
                if(listItemDateKeys.length>0){
                    doc.autoTable({
                        columnStyles: {
                            0: {cellWidth: 90},
                            1: {cellWidth: 20},
                            2: {cellWidth: 20},
                            3: {cellWidth: 20},
                            4: {cellWidth: 30},
                            // etc
                          },
                        body: bodyTable2,
                        startY: positionY,
                        theme: 'plain',
                        didDrawPage: ()=>{
                            this.newHeatherAndFooter(doc);
                        },
                        willDrawCell:(data)=>{
                            if (data.cell.section === 'body' && data.column.index === 4) {
                                var text = data.cell.text.toString()
                                data.cell.text = ""
                                doc.setTextColor(51, 101, 138)
                                var url = "https://hpo.jax.org/app/browse/term/" + text;
                                doc.textWithLink(text, (data.cell.x+data.cell.styles.cellPadding), (data.cell.y+3*+data.cell.styles.cellPadding), { url: url });
                            }
                        },
                        didParseCell: (data)=>{
                            if(!tableInfo2){
                                tableInfo2=data.table;
                            }
                        }
                        
                    });
                }else{
                    doc.autoTable({
                        head: [[this.translate.instant("generics.Name"),"ID"]],
                        body: bodyTable2,
                        startY: positionY,
                        theme: 'plain',
                        didDrawPage: ()=>{
                            this.newHeatherAndFooter(doc);
                        },
                        willDrawCell:(data)=>{
                            if (data.cell.section === 'body' && data.column.index === 1) {
                                var text = data.cell.text.toString()
                                data.cell.text = ""
                                doc.setTextColor(51, 101, 138)
                                var url = "https://hpo.jax.org/app/browse/term/" + text;
                                doc.textWithLink(text, (data.cell.x+data.cell.styles.cellPadding), (data.cell.y+3*+data.cell.styles.cellPadding), { url: url });
                            }
                        },
                        didParseCell: (data)=>{
                            if(!tableInfo2){
                                tableInfo2=data.table;
                            }
                        }
                        
                    });
                }
            }else{
                doc.autoTable({
                    head: [[this.translate.instant("generics.Name"),"ID"]],
                    body: bodyTable2,
                    startY: positionY,
                    theme: 'plain',
                    didDrawPage: ()=>{
                        this.newHeatherAndFooter(doc);
                    },
                    willDrawCell:(data)=>{
                        if (data.cell.section === 'body' && data.column.index === 1) {
                            var text = data.cell.text.toString()
                            data.cell.text = ""
                            doc.setTextColor(51, 101, 138)
                            var url = "https://hpo.jax.org/app/browse/term/" + text;
                            doc.textWithLink(text, (data.cell.x+data.cell.styles.cellPadding), (data.cell.y+3*+data.cell.styles.cellPadding), { url: url });
                        }
                    },
                    didParseCell: (data)=>{
                        if(!tableInfo2){
                            tableInfo2=data.table;
                        }
                    }
                    
                });
            }
            
            positionY = tableInfo2.finalY
        }
        return positionY;
    }

    dateDiff(d1:Date, d2:Date) {
        var months=0;
        var years=0;
        months = ((d2).getFullYear() - (d1).getFullYear()) * 12;
        months -= (d1).getMonth();
        months += (d2).getMonth();
        if(months>=12){
            years = Math.floor(months/12)
            months -=  years*12
        }
        var result="";
        if((months>1)&&(years>1)){
            result=years+" "+this.translate.instant("land.diagnosed.timeline.years")+" "+this.translate.instant("land.diagnosed.timeline.and")+" "+months+" "+this.translate.instant("land.diagnosed.timeline.months")
        }
        else if((months>1)&&(years==1)){
            result=years+" "+this.translate.instant("land.diagnosed.timeline.year")+" "+this.translate.instant("land.diagnosed.timeline.and")+" "+months+" "+this.translate.instant("land.diagnosed.timeline.months")
        }
        else if((months>1)&&(years<1)){
            result=months+" "+this.translate.instant("land.diagnosed.timeline.months")
        }
        else if((months==1)&&(years<1)){
            result=months+" "+this.translate.instant("land.diagnosed.timeline.month")
        }
        else if((months<1)&&(years>1)){
            result=years+" "+this.translate.instant("land.diagnosed.timeline.years")
        }
        else if((months<1)&&(years==1)){
            result=years+" "+this.translate.instant("land.diagnosed.timeline.year")

        }
        else if((months<1)&&(years<1)){
            result=this.translate.instant("land.diagnosed.timeline.Less than a month")
        }
        return result;
    }

    private newSectionDoc(doc,sectionNumber,sectionTitle,sectionSubtitle,line){
        //line = this.checkIfNewPage(doc, line);
        var title = sectionTitle;
        if(sectionNumber!=null){
            title=sectionNumber+sectionTitle;
        }
        var marginX = 10;
        //doc.setTextColor(117, 120, 125)
        doc.setTextColor(0, 0, 0)
        doc.setFont(undefined, 'bold');
        doc.setFontSize(12);
        doc.text(marginX, line, title);
        
        //doc.setTextColor(0, 0, 0)
        if(sectionSubtitle!=null){
            var subtitle = sectionSubtitle;
            doc.setFont(undefined, 'italic');
            doc.setFontSize(12);
            doc.text(marginX, line, subtitle);
        }
        
        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
    }

    private newHeatherAndFooter(doc){
        // Footer
        var logoHealth = new Image();
        logoHealth.src = "assets/img/logo-foundation-twentynine-footer.png"
        doc.addImage(logoHealth, 'png', 20, 284, 25, 10);
        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        doc.setTextColor(51, 101, 138)
        doc.textWithLink("https://raito.care", 148, 290, { url: 'https://raito.care' });
        doc.setTextColor(0, 0, 0);
    }

    private getFormatDate(date) {
        var localeLang = 'en-US';
        if (this.lang == 'es') {
            localeLang = 'es-ES'
        }else if (this.lang == 'de') {
            localeLang = 'de-DE'
        }else if (this.lang == 'fr') {
            localeLang = 'fr-FR'
        }else if (this.lang == 'it') {
            localeLang = 'it-IT'
        }else if (this.lang == 'pt') {
            localeLang = 'pt-PT'
        }
        return date.toLocaleString(localeLang, { month: 'long' , day: 'numeric', year: 'numeric'});
    }

    private pad(number) {
        if (number < 10) {
            return '0' + number;
        }
        return number;
    }
    private checkIfNewPage(doc, lineText) {
        if (lineText < 270) {
            return lineText
        }
        else {
            doc.addPage()
            this.newHeatherAndFooter(doc)
            lineText = 20;
            return lineText;
        }
    }

    private checkIfNewPage2(doc, lineText) {
        if (lineText < 270) {
            return lineText
        }
        else {
            doc.addPage()
            this.newHeatherAndFooter(doc)
            lineText = 20;
            return lineText;
        }
    }

    private writeTitleSection(doc, pos, lineText, text) {
        lineText = this.checkIfNewPage(doc, lineText);
        doc.setTextColor(117, 120, 125)
        doc.setFont(undefined, 'bold');
        doc.setFontSize(12);
        doc.text(text, pos, lineText);
        return lineText;
    }
    
    
    private writeHeaderText(doc, pos, lineText, text) {
        //doc.setTextColor(117, 120, 125)
        doc.setFont(undefined, 'bold');
        doc.setFontSize(10);
        doc.text(text, pos, lineText);
        return lineText;
    }
    
    private writeText(doc, pos, lineText, text) {
        lineText = this.checkIfNewPage(doc, lineText);
        doc.setTextColor(0, 0, 0)
        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        doc.text(text, pos, lineText);
        return lineText;
    }
    
    private writeLinkHP(doc, pos, lineText, text) {
        lineText = this.checkIfNewPage(doc, lineText);
        doc.setTextColor(51, 101, 138)
        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        var url = "https://hpo.jax.org/app/browse/term/" + text;
        doc.textWithLink(text, pos, lineText, { url: url });
        doc.setTextColor(0, 0, 0);
        return lineText;
    }
    
    private writeLinkOrpha(doc, pos, lineText, text) {
        lineText = this.checkIfNewPage(doc, lineText);
        doc.setTextColor(51, 101, 138)
        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        var param = text.split(':');
        var url = "https://www.orpha.net/consor/cgi-bin/OC_Exp.php?Expert=" + param[1] + "&lng=" + this.lang;
        doc.textWithLink(text, pos, lineText, { url: url });
        doc.setTextColor(0, 0, 0);
        return lineText;
    }

    private writeHeader(doc, pos, lineText, text) {
        doc.setTextColor(117, 120, 125)
        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);
        doc.text(text, pos, lineText += 20);
    }

    private writeDataHeader(doc, pos, lineText, text) {
        doc.setTextColor(0, 0, 0)
        doc.setFont(undefined, 'bold');
        doc.setFontSize(10);
        doc.text(text, pos, lineText += 20);
    }

    private getDate() {
        var date = new Date()
        return date.getUTCFullYear() + this.pad(date.getUTCMonth() + 1) + this.pad(date.getUTCDate()) + this.pad(date.getUTCHours()) + this.pad(date.getUTCMinutes()) + this.pad(date.getUTCSeconds());
    };

    private writeAboutUs(doc,lineText){
        lineText = this.checkIfNewPage(doc, lineText);
        doc.setFont(undefined, 'bold');
        doc.text(this.translate.instant("generics.Foundation 29"), 10, lineText);
        this.writelinePreFooter(doc, this.translate.instant("land.diagnosed.timeline.footer1"), lineText += 5);
        lineText = this.checkIfNewPage(doc, lineText);
        this.writelinePreFooter(doc, this.translate.instant("land.diagnosed.timeline.footer2"), lineText += 5);
        lineText = this.checkIfNewPage(doc, lineText);
        this.writelinePreFooter(doc, this.translate.instant("land.diagnosed.timeline.footer3"), lineText += 5);
        if(this.lang =='es'){
            lineText = this.checkIfNewPage(doc, lineText);
            this.writelinePreFooter(doc, this.translate.instant("land.diagnosed.timeline.footer4"), lineText += 5);
        }
        lineText = this.checkIfNewPage(doc, lineText);
        lineText += 10;
        lineText = this.checkIfNewPage(doc, lineText);
        this.writelinePreFooter(doc, this.translate.instant("land.diagnosed.timeline.footer5"), lineText);
        doc.setFillColor(249,66,58);
        if(this.lang=='en'){
            doc.rect(52, lineText-5, 17, 8, 'FD'); //Fill and Border
        }else{
            doc.rect(57, lineText-5, 17, 8, 'FD'); //Fill and Border
        }
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        var url = "https://raito.care/register";
        if(this.lang=='en'){
            doc.textWithLink(this.translate.instant("menu.Register"), 54, lineText, { url: url });
        }else{
            doc.textWithLink(this.translate.instant("menu.Register"), 59, lineText, { url: url });
        }
        
        lineText = this.checkIfNewPage(doc, lineText);
        doc.setTextColor(0, 0, 0)
        lineText += 5;
        doc.setFontSize(9);
        doc.setTextColor(117, 120, 125)
        doc.text(this.translate.instant("land.diagnosed.timeline.footer6"), 10, lineText += 5);
        doc.setTextColor(51, 101, 138)
        var url = "mailto:info@foundation29.org";
        doc.textWithLink("info@foundation29.org", (((this.translate.instant("land.diagnosed.timeline.footer6")).length*2)-18), lineText, { url: url });
        //lineText = this.checkIfNewPage(doc, lineText);
        doc.setTextColor(0, 0, 0);
    }

    writelinePreFooter(doc, text, lineText){
        doc.setFontSize(9);
        doc.setTextColor(117, 120, 125)
        doc.setFont(undefined, 'normal');
        doc.text(text, 10, lineText);
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
    }

    generateResultsPDF(infoSymptoms, infoDrugs, lang, images, rangeDate, timeformat, seizuresMonths){
        this.lang = lang;
        const doc = new jsPDF();
        var lineText = 0;
        const marginX = 5;
        
        const pdfPageWidth = doc.internal.pageSize.getWidth() - 2 * marginX;
        const pdfPageHeight = doc.internal.pageSize.getHeight()

        // Cabecera inicial
        var img_logo = new Image();
        img_logo.src = "assets/img/logo.png"
        doc.addImage(img_logo, 'png', 10, 10, 20, 17);
        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        var actualDate = new Date();
        var dateHeader = this.getFormatDate(actualDate);
        if(lang=='es'){
            this.writeHeader(doc, 89, 0, this.translate.instant("land.diagnosed.timeline.RegDate"));
            this.writeDataHeader(doc, 87, 5, dateHeader);
        }else{
            this.writeHeader(doc, 93, 0, this.translate.instant("land.diagnosed.timeline.RegDate"));
            this.writeDataHeader(doc, 93, 5, dateHeader);
        }

       //Add QR
        /*var img_qr = new Image();
        img_qr.src = "assets/img/elements/qr.png"
        doc.addImage(img_qr, 'png', 160, 5, 32, 30);*/
        doc.addImage(images.qrcodeimg.info.data,'jpeg',160, 5, 32, 32);

        this.newHeatherAndFooter(doc);

        lineText += 25;
        doc.setFont(undefined, 'bold');
        doc.setFontSize(15);
        doc.text(this.translate.instant("land.diagnosed.timeline.Report"), 10, lineText += 15);
        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);
        doc.setTextColor(117, 120, 125)
        doc.text(this.translate.instant("land.diagnosed.timeline.subtitlea"), 10, lineText += 5)
        doc.text(this.translate.instant("land.diagnosed.timeline.subtitleb"), 10, lineText += 5)
        lineText += 5
        doc.setTextColor(0, 0, 0)
        doc.setFontSize(10);

        /*doc.addImage(img,'jpeg',7, lineText += 5, 132, heightChart);
        doc.addPage()
        this.newHeatherAndFooter(doc)
        lineText = 20;*/
        //Seizures
        /*doc.setFontSize(9);
        doc.setTextColor(249, 66, 58)
        doc.text(this.translate.instant("pdf.contentDemo"), 10, lineText += 5)*/
        lineText = this.checkIfNewPage(doc, lineText);
        this.newSectionDoc(doc,this.translate.instant("menu.Seizures"),'',null,lineText += 10)
        lineText = this.checkIfNewPage(doc, lineText);
        doc.setFontSize(9);
        doc.setTextColor(117, 120, 125)
        doc.text(this.translate.instant("pdf.grap1"), 10, lineText += 5)
        doc.setTextColor(0, 0, 0)
        doc.setFontSize(10);
        if(images.img1.show){
            doc.addImage(images.img1.info.data,'jpeg',10, lineText += 5, images.img1.info.width, images.img1.info.height);
            lineText += 40
        }else{
            var infoText = this.translate.instant("charts.Noseizures")+' '+this.translate.instant("charts.in the last");
            if(rangeDate=='month'){
                infoText = infoText+" "+this.translate.instant("charts.month");
            }else if(rangeDate=='quarter'){
                infoText = infoText+" "+this.translate.instant("charts.quarter");
            }else if(rangeDate=='year'){
                infoText = infoText+" "+this.translate.instant("charts.year");
            }
            doc.text(infoText, 10, lineText += 5)
            lineText += 5
        }

        //Quality of life
        lineText = this.checkIfNewPage(doc, lineText);
        this.newSectionDoc(doc,this.translate.instant("charts.Quality of life"),'',null,lineText += 10)
        lineText = this.checkIfNewPage(doc, lineText);
        doc.setFontSize(9);
        doc.setTextColor(117, 120, 125)
        doc.text(this.translate.instant("pdf.grap2"), 10, lineText += 5)
        doc.setTextColor(0, 0, 0)
        doc.setFontSize(10);
        
        if(images.img2.show){
            doc.addImage(images.img2.info.data,'jpeg',10, lineText += 5, images.img2.info.width, images.img2.info.height);
            lineText += 35
        }else{
            var infoText = this.translate.instant("charts.No data saved")+' '+this.translate.instant("charts.in the last");
            if(rangeDate=='month'){
                infoText = infoText+" "+this.translate.instant("charts.month");
            }else if(rangeDate=='quarter'){
                infoText = infoText+" "+this.translate.instant("charts.quarter");
            }else if(rangeDate=='year'){
                infoText = infoText+" "+this.translate.instant("charts.year");
            }
            doc.text(infoText, 10, lineText += 5)
            lineText += 5
        }

        //Drugs
        lineText = this.checkIfNewPage(doc, lineText);
        this.newSectionDoc(doc,this.translate.instant("clinicalinfo.Drugs"),'',null,lineText += 10)
        lineText = this.checkIfNewPage(doc, lineText);
        doc.setFontSize(9);
        doc.setTextColor(117, 120, 125)
        if(images.img3.normalized){
            doc.text(this.translate.instant("pdf.grap3"), 10, lineText += 5)
        }else{
            doc.text(this.translate.instant("pdf.grap3.1"), 10, lineText += 5)
        }
        
        doc.setTextColor(0, 0, 0)
        doc.setFontSize(10);
        if(images.img3.show){
            doc.addImage(images.img3.info.data,'jpeg',10, lineText += 5, images.img3.info.width, images.img3.info.height);
            lineText += 35
        }else{
            var infoText = this.translate.instant("charts.There is no drug data stored")+' '+this.translate.instant("charts.in the last");
            if(rangeDate=='month'){
                infoText = infoText+" "+this.translate.instant("charts.month");
            }else if(rangeDate=='quarter'){
                infoText = infoText+" "+this.translate.instant("charts.quarter");
            }else if(rangeDate=='year'){
                infoText = infoText+" "+this.translate.instant("charts.year");
            }
            doc.text(infoText, 10, lineText += 5)
            lineText += 5
        }
        
        if(infoDrugs.length>0){
            doc.addPage()
            this.newHeatherAndFooter(doc)
            lineText = 20;
        }
        

        //Drugs vs seizures
       
        if(images.img4.show){
            lineText = this.checkIfNewPage(doc, lineText);
            this.newSectionDoc(doc,this.translate.instant("charts.Drugs vs Seizures"),'',null,lineText += 10)
            lineText = this.checkIfNewPage(doc, lineText);
            doc.setFontSize(9);
            doc.setTextColor(117, 120, 125)
            if(images.img4.normalized){
                doc.text(this.translate.instant("pdf.grap4"), 10, lineText += 5)
            }else{
                doc.text(this.translate.instant("pdf.grap4.1"), 10, lineText += 5)
            }
            doc.setTextColor(0, 0, 0)
            doc.setFontSize(10);
            doc.addImage(images.img4.info.data,'jpeg',10, lineText += 5, images.img4.info.width, images.img4.info.height);
            lineText += 35
        }
        //lineText += 34

        
        if(infoDrugs.length==0){
            doc.addPage()
            this.newHeatherAndFooter(doc)
            lineText = 20;
        }else{
            lineText += 40;
            if(images.img4.show){
                lineText= lineText + (infoDrugs.length*5) 
            }
        }
        
        //Symptoms
        const obj = infoSymptoms;
        lineText = this.checkIfNewPage(doc, lineText);
        this.newSectionDoc(doc,this.translate.instant("diagnosis.Symptoms"),'',null,lineText += 10)
        lineText = this.checkIfNewPage(doc, lineText);
        if(obj.length>0){
            doc.setFontSize(9);
            doc.setTextColor(117, 120, 125)
            doc.text(this.translate.instant("seizures.These are the symptoms included in Raito by the user"), 10, lineText += 5)
            doc.setTextColor(0, 0, 0)
            doc.setFontSize(10);
            lineText += 2;
            lineText = this.checkIfNewPage(doc, lineText);
            this.writeHeaderText(doc, 10, lineText += 7, this.translate.instant("generics.Name"));
            this.writeHeaderText(doc, 175, lineText, "Id");
            lineText += 5;
            for (var i = 0; i < obj.length; i++) {
                lineText = this.writeText(doc, 10, lineText, obj[i].name);
                lineText = this.writeLinkHP(doc, 175, lineText, (obj[i].id).toUpperCase());
                lineText += 7;
            }
        }else{
            lineText = this.writeText(doc, 10, lineText+= 7, this.translate.instant("seizures.No symptoms have been added in Raito"));
            lineText += 7;
        }
        

        //Diseases
        if(infoDrugs.length>0){
            lineText = this.checkIfNewPage(doc, lineText);
            this.newSectionDoc(doc,this.translate.instant("clinicalinfo.Drugs"),'',null,lineText += 10)
            lineText = this.checkIfNewPage(doc, lineText);
            this.writeHeaderText(doc, 10, lineText += 7, this.translate.instant("generics.Name"));
            this.writeHeaderText(doc, 80, lineText, this.translate.instant("medication.Dose mg"));
            this.writeHeaderText(doc, 120, lineText, this.translate.instant("generics.Start Date"));
            this.writeHeaderText(doc, 155, lineText, this.translate.instant("generics.End Date"));
            lineText += 5;
            for (var i = 0; i < infoDrugs.length; i++) {
                lineText = this.writeText(doc, 10, lineText, infoDrugs[i].drugTranslate);
                lineText = this.writeText(doc, 80, lineText, infoDrugs[i].dose);
                lineText = this.writeText(doc, 120, lineText, (infoDrugs[i].startDate != "" && infoDrugs[i].startDate != undefined && infoDrugs[i].startDate != null)? this.datePipe.transform(infoDrugs[i].startDate, timeformat) : "-");
                if(infoDrugs[i].endDate){
                    lineText = this.writeText(doc, 155, lineText, (infoDrugs[i].endDate != "" && infoDrugs[i].endDate != undefined && infoDrugs[i].endDate != null)? this.datePipe.transform(infoDrugs[i].endDate, timeformat) : "-");
                }else{
                    lineText = this.writeText(doc, 155, lineText, this.translate.instant("medication.Currently taking"));
                }
                lineText += 7;
            }
        }


        if(seizuresMonths.length>0){
            lineText = this.checkIfNewPage(doc, lineText+=10);
            this.newSectionDoc(doc,this.translate.instant("menu.Seizures"),'',null,lineText += 10)
            lineText = this.checkIfNewPage(doc, lineText);
            this.writeHeaderText(doc, 10, lineText += 7, this.translate.instant("generics.Date"));
            this.writeHeaderText(doc, 35, lineText, this.translate.instant("pdf.Amount"));
            this.writeHeaderText(doc, 70, lineText, this.translate.instant("generics.Date"));
            this.writeHeaderText(doc, 95, lineText, this.translate.instant("pdf.Amount"));
            this.writeHeaderText(doc, 130, lineText, this.translate.instant("generics.Date"));
            this.writeHeaderText(doc, 155, lineText, this.translate.instant("pdf.Amount"));
            lineText += 5;
            for (var i = 0; i < seizuresMonths.length; i++) {
                if(i % 3 == 0){
                    //first column
                    if(rangeDate == 'month'){
                        lineText = this.writeText(doc, 10, lineText, (seizuresMonths[i].stringDate != "" && seizuresMonths[i].stringDate != undefined && seizuresMonths[i].stringDate != null)? this.datePipe.transform(seizuresMonths[i].stringDate, 'dd MMM') : "-");
                    }else{
                        lineText = this.writeText(doc, 10, lineText, (seizuresMonths[i].name != "" && seizuresMonths[i].name != undefined && seizuresMonths[i].name != null)? this.datePipe.transform(seizuresMonths[i].name, 'MMM yyyy') : "-");
                    }
                    lineText = this.writeText(doc, 35, lineText, (seizuresMonths[i].value).toString());
                    //second column
                    if(i + 1 < seizuresMonths.length){
                        if(rangeDate == 'month'){
                            lineText = this.writeText(doc, 70, lineText, (seizuresMonths[i+1].stringDate != "" && seizuresMonths[i+1].stringDate != undefined && seizuresMonths[i+1].stringDate != null)? this.datePipe.transform(seizuresMonths[i+1].stringDate, 'dd MMM') : "-");
                        }else{
                            lineText = this.writeText(doc, 70, lineText, (seizuresMonths[i+1].name != "" && seizuresMonths[i+1].name != undefined && seizuresMonths[i+1].name != null)? this.datePipe.transform(seizuresMonths[i+1].name, 'MMM yyyy') : "-");
                        }
                        lineText = this.writeText(doc, 95, lineText, (seizuresMonths[i+1].value).toString());
                    }
                    //third column
                    if(i + 2 < seizuresMonths.length){
                        if(rangeDate == 'month'){
                            lineText = this.writeText(doc, 130, lineText, (seizuresMonths[i+2].stringDate != "" && seizuresMonths[i+2].stringDate != undefined && seizuresMonths[i+2].stringDate != null)? this.datePipe.transform(seizuresMonths[i+2].stringDate, 'dd MMM') : "-");
                        }else{
                            lineText = this.writeText(doc, 130, lineText, (seizuresMonths[i+2].name != "" && seizuresMonths[i+2].name != undefined && seizuresMonths[i+2].name != null)? this.datePipe.transform(seizuresMonths[i+2].name, 'MMM yyyy') : "-");
                        }
                        lineText = this.writeText(doc, 155, lineText, (seizuresMonths[i+2].value).toString());
                    }
                    lineText += 7;
                }
                
            }
        }

        lineText += 10;
        this.writeAboutUs(doc, lineText);
        
        var pageCount = doc.internal.pages.length; //Total Page Number
        pageCount = pageCount-1;
        for (i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            //footer page
            doc.text(this.translate.instant("land.page")+ ' ' + i + '/' + pageCount, 97, 290);
        }

        // Save file
        var date = this.getDate();
        doc.save('Raito_Report_' + date + '.pdf',);
        var blob2 = doc.output('blob');
        return blob2;
        /*var name = 'Raito_Report_' + date + '.pdf';
        doc.setProperties({
            title: name
            });
        doc.output('dataurlnewwindow');*/

    }


    // Order by descending key
    keyDescOrder = ((a, b) => {
        var a_month=a.split("-")[0]
        var a_year = a.split("-")[1]
        var b_month=b.split("-")[0]
        var b_year=b.split("-")[1]
        a_month = this.getMonthFromString(a_month);
        b_month = this.getMonthFromString(b_month);
        if(new Date(a_year).getTime() > new Date(b_year).getTime()){
            return 1;
        }
        else if(new Date(a_year).getTime() < new Date(b_year).getTime()){
            return -1;
        }
        else{
            if(new Date(a_month).getTime() > new Date(b_month).getTime()){
                return 1;
            }
            else if(new Date(a_month).getTime() < new Date(b_month).getTime()){
                return -1;
            }
            else{
                return 0;
            }
        }
    })

    getMonthFromString(mon) {
        if (this.lang != 'es') {
            return new Date(Date.parse(mon + " 1, 2012")).getMonth() + 1
        } else {
            var date = new Date(Date.parse(this.meses[mon] + " 1, 2012")).getMonth() + 1;
            return date;
        }

    }

    // Order by descending value
    valueDateDescOrder = ((a,b)=> {
        if(new Date(a).getTime() > new Date(b).getTime()){
            return -1;
        }
        else if(new Date(a).getTime() < new Date(b).getTime()){
            return -1;
        }
        else return 0;
    })

}
