import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxEchartsDirective } from 'ngx-echarts';

@Component({
  selector: 'app-chart-widget',
  standalone: true,
  imports: [CommonModule, NgxEchartsDirective],
  templateUrl: './chart-widget.component.html',
  styleUrl: './chart-widget.component.css'
})
export class ChartWidgetComponent {
  @Input() title: string = '';
  @Input() options: any = {};
  @Input() actionText: string = 'View All';
  @Output() actionClick = new EventEmitter<void>();

  onActionClick(event: Event) {
    event.preventDefault();
    this.actionClick.emit();
  }
}
