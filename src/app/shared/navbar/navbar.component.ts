import { Component, Output, EventEmitter, OnDestroy, OnInit, AfterViewInit, ChangeDetectorRef, Inject, Renderer2, ViewChild, ElementRef, ViewChildren, QueryList, HostListener } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { LayoutService } from '../services/layout.service';
import { Subscription } from 'rxjs';
import { ConfigService } from '../services/config.service';
import { DOCUMENT } from '@angular/common';
import { CustomizerService } from '../services/customizer.service';
import { UntypedFormControl } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { AuthService } from 'app/shared/auth/auth.service';
import { EventsService} from 'app/shared/services/events.service';
import { PatientService } from 'app/shared/services/patient.service';

declare global {
    interface Navigator {
      app: {
          exitApp: () => any; // Or whatever is the type of the exitApp function
      }
    }
}

@Component({
  selector: "app-navbar",
  templateUrl: "./navbar.component.html",
  styleUrls: ["./navbar.component.scss"],
  providers: [PatientService]
})
export class NavbarComponent implements OnInit, AfterViewInit, OnDestroy {
  placement = "bottom-right";
  logoUrl = 'assets/img/logo.png';
  menuPosition = 'Side';
  isSmallScreen = false;
  protected innerWidth: any;
  transparentBGClass = "";
  hideSidebar: boolean = true;
  public isCollapsed = true;
  layoutSub: Subscription;
  configSub: Subscription;

  @Output()
  toggleHideSidebar = new EventEmitter<Object>();

  control = new UntypedFormControl();

  public config: any = {};
  role: string = 'User';
  actualUrl: string = '';
  isAndroid: boolean = false;
  private subscription: Subscription = new Subscription();

  constructor(public translate: TranslateService,
    private layoutService: LayoutService,
    private router: Router,
    private configService: ConfigService, private cdr: ChangeDetectorRef, private authService: AuthService, private eventsService: EventsService, private patientService: PatientService) {
      
      this.role = this.authService.getRole();

    this.config = this.configService.templateConf;
    this.innerWidth = window.innerWidth;

    this.layoutSub = layoutService.toggleSidebar$.subscribe(
      isShow => {
        this.hideSidebar = !isShow;
      });

      this.router.events.filter((event: any) => event instanceof NavigationEnd).subscribe(
        event => {
          const tempUrl = (event.url).toString().split('?');
          this.actualUrl = tempUrl[0];
        }
      );

      this.isAndroid = false;
      var touchDevice = (navigator.maxTouchPoints || 'ontouchstart' in document.documentElement);
      console.log('touchDevice', touchDevice)
      if (touchDevice>1 && /Android/i.test(navigator.userAgent)) {
        this.isAndroid = true;
      }
      
  }
  

  ngOnInit() {
    if (this.innerWidth < 1200) {
      this.isSmallScreen = true;
    }
    else {
      this.isSmallScreen = false;
    }

  }


  ngAfterViewInit() {

    this.configSub = this.configService.templateConf$.subscribe((templateConf) => {
      if (templateConf) {
        this.config = templateConf;
      }
      this.loadLayout();
      this.cdr.markForCheck();

    })
  }

  ngOnDestroy() {
    if (this.layoutSub) {
      this.layoutSub.unsubscribe();
    }
    if (this.configSub) {
      this.configSub.unsubscribe();
    }
  }

  @HostListener('window:resize', ['$event'])
  onResize(event) {
    this.innerWidth = event.target.innerWidth;
    if (this.innerWidth < 1200) {
      this.isSmallScreen = true;
    }
    else {
      this.isSmallScreen = false;
    }
  }

  loadLayout() {

    if (this.config.layout.menuPosition && this.config.layout.menuPosition.toString().trim() != "") {
      this.menuPosition = this.config.layout.menuPosition;
    }

    if (this.config.layout.variant === "Light") {
      this.logoUrl = 'assets/img/logo.png';
    }
    else {
      this.logoUrl = 'assets/img/logo.png';
    }

    if (this.config.layout.variant === "Transparent") {
      this.transparentBGClass = this.config.layout.sidebar.backgroundColor;
    }
    else {
      this.transparentBGClass = "";
    }

  }

  toggleNotificationSidebar() {
    this.layoutService.toggleNotificationSidebar(true);
  }

  toggleSidebar() {
    this.layoutService.toggleSidebarSmallScreen(this.hideSidebar);
  }

  logout() {
    this.authService.logout();
  }

  exit() {
    navigator.app.exitApp();
}
}
