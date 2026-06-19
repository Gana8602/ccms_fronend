import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-weather',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex items-center justify-between h-full px-2 text-primary">
      <div class="flex flex-col items-center gap-1">
        <i class="pi pi-cloud text-3xl text-primary-blue"></i>
        <div class="flex flex-col text-center mt-1">
          <span class="text-xl font-display font-bold">24°C</span>
          <span class="text-[9px] font-bold tracking-wider text-muted">LIGHT RAIN</span>
        </div>
      </div>
      
      <div class="flex flex-col gap-1 border-l border-divider pl-3">
        <div class="text-[8px] flex justify-between gap-4"><span class="text-muted">Humidity</span><span class="font-bold">87%</span></div>
        <div class="text-[8px] flex justify-between gap-4"><span class="text-muted">Wind Speed</span><span class="font-bold">8 km/h</span></div>
        <div class="text-[8px] flex justify-between gap-4"><span class="text-muted">Visibility</span><span class="font-bold">6 km</span></div>
        <div class="text-[8px] flex justify-between gap-4"><span class="text-muted">Feels Like</span><span class="font-bold">23°C</span></div>
      </div>
      
      <div class="flex gap-2 ml-2">
        <div class="flex flex-col items-center">
          <span class="text-[7px] text-muted mb-1 font-bold">SUN 18</span>
          <i class="pi pi-cloud text-primary-blue text-[10px]"></i>
          <span class="text-[7px] font-bold mt-1">22°/18°</span>
        </div>
        <div class="flex flex-col items-center">
          <span class="text-[7px] text-muted mb-1 font-bold">MON 19</span>
          <i class="pi pi-cloud text-primary-blue text-[10px]"></i>
          <span class="text-[7px] font-bold mt-1">24°/19°</span>
        </div>
      </div>
    </div>
  `
})
export class WeatherComponent {}
