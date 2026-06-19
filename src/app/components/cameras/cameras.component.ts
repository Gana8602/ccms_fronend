import { Component, signal, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-cameras',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (type() === 'default') {
      <div class="flex gap-2 h-full">
        @for (cam of cameras(); track cam.id) {
          <div class="relative w-40 h-full rounded overflow-hidden group shrink-0 border border-divider cursor-pointer shadow-sm">
            <img [src]="cam.img" [alt]="cam.name" class="w-full h-full object-cover">
            
            <div class="absolute top-1 right-1 bg-primary-blue text-white text-[8px] px-1 py-0.5 rounded font-bold uppercase flex items-center gap-1 shadow-sm">
              Live
            </div>
            
            <div class="absolute bottom-0 left-0 right-0 bg-white/90 dark:bg-black/90 p-1 border-t border-divider">
              <div class="text-[8px] font-bold text-primary truncate">{{ cam.name }}</div>
            </div>
          </div>
        }
      </div>
    } @else {
      <!-- Minimal Preview Mode -->
      <div class="flex gap-1 h-full w-full">
        @for (cam of cameras().slice(0,3); track cam.id) {
          <div class="relative flex-1 h-full rounded overflow-hidden border border-divider shadow-sm">
            <img [src]="cam.img" class="w-full h-full object-cover">
            <div class="absolute bottom-0 left-0 right-0 bg-white/90 dark:bg-black/90 text-[6px] text-primary p-0.5 text-center truncate font-bold border-t border-divider">{{cam.name}}</div>
          </div>
        }
      </div>
    }
  `
})
export class CamerasComponent {
  type = input<'default' | 'preview'>('default');
  
  cameras = signal([
    { id: 1, name: 'Nilakkal Base Camp', status: 'Normal Flow', img: 'https://images.unsplash.com/photo-1541888045610-1a73eef125ed?q=80&w=400&auto=format&fit=crop' },
    { id: 2, name: 'Nilakkal - 2 KM', status: 'Moderate Traffic', img: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?q=80&w=400&auto=format&fit=crop' },
    { id: 3, name: 'Nilakkal - 5 KM', status: 'High Density', img: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?q=80&w=400&auto=format&fit=crop' },
    { id: 4, name: 'Pamba', status: 'Normal Flow', img: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?q=80&w=400&auto=format&fit=crop' },
    { id: 5, name: 'Pamba Sub Control Room', status: 'Monitoring', img: 'https://images.unsplash.com/photo-1541888045610-1a73eef125ed?q=80&w=400&auto=format&fit=crop' },
    { id: 6, name: 'Sabaripedam', status: 'Monitoring', img: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?q=80&w=400&auto=format&fit=crop' }
  ]);
}
