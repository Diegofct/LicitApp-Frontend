import { Component, OnInit, HostListener, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'],
})
export class SidebarComponent implements OnInit {
  open = true;
  private isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) private platformId: object) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit() {
    if (this.isBrowser) {
      this.checkScreenWidth();
    }
  }

  @HostListener('window:resize', ['$event'])
  onResize(event?: Event) {
    this.checkScreenWidth();
  }

  private checkScreenWidth() {
    if (this.isBrowser) {
      this.open = window.innerWidth > 768;
    }
  }

  toggle() {
    this.open = !this.open;
  }
}
