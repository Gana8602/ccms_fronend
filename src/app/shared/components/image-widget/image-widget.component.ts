import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-image-widget',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './image-widget.component.html',
  styleUrl: './image-widget.component.css'
})
export class ImageWidgetComponent {
  @Input() title: string = '';
  @Input() imageUrl: string = '';
  @Input() actionText: string = 'View Fullscreen';
  @Input() height: string = '250px';
  @Input() isLive: boolean = false;
  @Input() caption: string = '';
  @Output() actionClick = new EventEmitter<void>();

  onActionClick(event: Event) {
    event.preventDefault();
    this.actionClick.emit();
  }
}
