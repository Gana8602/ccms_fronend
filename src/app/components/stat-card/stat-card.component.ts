import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface StatData {
  title: string;
  value: string;
  trend: string;
  trendType: 'up' | 'down' | 'neutral';
  color: 'blue' | 'cyan' | 'red' | 'orange' | 'green';
}

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stat-card.component.html',
  styles: ''
})
export class StatCardComponent {
  data = input<StatData>();
  type = input<'default' | 'minimal'>('default');
}
