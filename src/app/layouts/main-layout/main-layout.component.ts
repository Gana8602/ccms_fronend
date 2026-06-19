import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { TopbarComponent } from '../../components/topbar/topbar.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, TopbarComponent],
  template: `
    <div class="flex h-screen w-screen overflow-hidden transition-colors duration-200">
      <app-sidebar class="flex-shrink-0 h-full w-[240px] border-r border-divider bg-white dark:bg-[#111111] z-20 relative flex flex-col shadow-sm"></app-sidebar>
      
      <div class="flex flex-col flex-grow h-full overflow-hidden relative">
        <app-topbar class="flex-shrink-0 h-[60px] border-b border-divider bg-white dark:bg-[#111111] z-10 flex items-center px-6 shadow-sm"></app-topbar>
        
        <main class="flex-grow overflow-y-auto relative p-2 flex flex-col">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
  styles: ``
})
export class MainLayoutComponent {}
