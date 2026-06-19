import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

interface NavItem {
  label: string;
  icon: string;
  route?: string;
  active?: boolean;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidebar.component.html',
  styles: ``
})
export class SidebarComponent implements OnInit {
  private router = inject(Router);
  logoPath = 'assets/logo.png';
  
  navItems = signal<NavItem[]>([
    { label: 'DASHBOARD', icon: 'pi pi-th-large', route: '/dashboard', active: true },
    { label: 'LIVE MONITORING', icon: 'pi pi-video', route: '/live_monitoring' },
    { label: 'CROWD ANALYTICS', icon: 'pi pi-chart-bar' },
    { label: 'PILGRIM COUNT', icon: 'pi pi-users' },
    { label: 'ROUTE MAP', icon: 'pi pi-map' },
    { label: 'CROWD DENSITY', icon: 'pi pi-wifi' },
    { label: 'HIGH RISK MONITORING', icon: 'pi pi-exclamation-triangle' },
    { label: 'AGE GROUP MONITORING', icon: 'pi pi-user' },
    { label: 'IOT SENSORS', icon: 'pi pi-box' },
    { label: 'AI CAMERAS', icon: 'pi pi-camera' },
    { label: 'ALERTS & INCIDENTS', icon: 'pi pi-bell' },
    { label: 'WEATHER', icon: 'pi pi-cloud' },
    { label: 'TRAFFIC STATUS', icon: 'pi pi-car' },
    { label: 'FACILITIES', icon: 'pi pi-home' },
    { label: 'COMMAND CENTER', icon: 'pi pi-desktop' },
    { label: 'REPORTS', icon: 'pi pi-file' },
    { label: 'SYSTEM SETTINGS', icon: 'pi pi-cog', route: '/system_settings' }
  ]);
  
  quickAccess = signal<NavItem[]>([
    { label: 'Live Announcements', icon: 'pi pi-megaphone' },
    { label: 'Route Advisories', icon: 'pi pi-map-marker' },
    { label: 'Traffic Updates', icon: 'pi pi-car' },
    { label: 'Medical Assistance', icon: 'pi pi-heart' },
    { label: 'Lost & Found', icon: 'pi pi-briefcase' },
    { label: 'Feedback / Complaints', icon: 'pi pi-comments' }
  ]);
  
  ngOnInit() {
    // Listen for route changes to update active state
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.navItems.update(items => items.map((item) => ({ 
        ...item, 
        active: item.route ? event.urlAfterRedirects.startsWith(item.route) : false 
      })));
    });
  }

  selectNav(index: number) {
    const item = this.navItems()[index];
    if (item.route) {
      this.router.navigate([item.route]);
    }
  }
}
