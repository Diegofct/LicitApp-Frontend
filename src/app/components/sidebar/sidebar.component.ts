import { Component, OnInit, HostListener, Inject, PLATFORM_ID, Output, EventEmitter } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'],
})
export class SidebarComponent implements OnInit {
  @Output() sidebarToggled = new EventEmitter<boolean>();
  open = true;
  private isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) private platformId: object) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit() {
    if (this.isBrowser) {
      this.checkScreenWidth();
      this.sidebarToggled.emit(this.open); // Emit initial state
    }
  }

  @HostListener('window:resize', ['$event'])
  onResize(event?: Event) {
    const previousOpenState = this.open;
    this.checkScreenWidth();
    if (this.open !== previousOpenState) { // Only emit if state actually changed
      this.sidebarToggled.emit(this.open);
    }
  }

  private checkScreenWidth() {
    if (this.isBrowser) {
      this.open = window.innerWidth > 768;
    }
  }

  toggle() {
    this.open = !this.open;
    this.sidebarToggled.emit(this.open);
  }
}
