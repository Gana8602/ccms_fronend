import { Component, signal, ElementRef, ViewChild, AfterViewInit, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CcmsApiService } from '../../core/services/ccms-api.service';

interface Camera {
  id: string;
  name: string;
  status: 'online' | 'offline';
  feedUrl: string;
  gcpPoints?: any;
}

@Component({
  selector: 'app-system-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './system-settings.component.html',
  styles: ``
})
export class SystemSettingsComponent implements OnInit, AfterViewInit {
  private api = inject(CcmsApiService);

  // Camera Adding State
  newCameraName = '';
  newCameraUrl = '';

  cameras = signal<Camera[]>([]);

  // GCP State
  @ViewChild('gcpCanvas') gcpCanvas!: ElementRef<HTMLCanvasElement>;
  activeGcpCamera = signal<Camera | null>(null);
  activeGcpPoint = signal<'top_left' | 'top_right' | 'bottom_right' | 'bottom_left'>('top_left');
  gcpPoints = signal<Record<string, { x: number, y: number } | undefined>>({});

  ngOnInit() {
    this.loadCameras();
  }

  loadCameras() {
    this.api.getCameras().subscribe(res => {
      if (res && res.cameras) {
        const loadedCams: Camera[] = res.cameras.map((c: any) => ({
          id: c.id,
          name: c.name,
          status: 'online',
          feedUrl: `/video_feed/${c.id}/`,
          gcpPoints: c.gcp_points
        }));
        this.cameras.set(loadedCams);
        
        // If a camera was selected for GCP, update it
        const currentActive = this.activeGcpCamera();
        if (currentActive) {
            const updated = loadedCams.find(cam => cam.id === currentActive.id);
            if (updated) {
                this.activeGcpCamera.set(updated);
            } else {
                this.activeGcpCamera.set(null);
                this.clearGcp();
            }
        }
      }
    });
  }

  ngAfterViewInit() {
    this.drawGcp();
  }

  addCamera() {
    if (this.newCameraName && this.newCameraUrl) {
      this.api.addCamera(this.newCameraName, this.newCameraUrl).subscribe({
        next: (res) => {
          if (res.status === 'success') {
            alert('Camera successfully added to Database!');
            this.newCameraName = '';
            this.newCameraUrl = '';
            this.loadCameras();
          }
        },
        error: (err) => {
          alert('Error adding camera: ' + err.message);
        }
      });
    }
  }

  deleteCamera(id: string) {
    if (confirm('Are you sure you want to delete this camera? This will stop its background stream.')) {
        this.api.deleteCamera(id).subscribe({
            next: (res) => {
                if (res.status === 'success') {
                    alert('Camera deleted.');
                    this.loadCameras();
                }
            },
            error: (err) => {
                alert('Error deleting camera: ' + err.message);
            }
        });
    }
  }

  selectGcpCamera(cam: Camera) {
    this.activeGcpCamera.set(cam);
    if (cam.gcpPoints) {
        this.gcpPoints.set(cam.gcpPoints);
    } else {
        this.gcpPoints.set({});
    }
    setTimeout(() => this.drawGcp(), 50);
  }

  onGcpClick(e: MouseEvent) {
    if (!this.activeGcpCamera() || !this.gcpCanvas) return;
    const pos = this.getMousePos(this.gcpCanvas.nativeElement, e);
    const pts = { ...this.gcpPoints() };
    pts[this.activeGcpPoint()] = pos;
    this.gcpPoints.set(pts);
    this.drawGcp();
  }

  drawGcp() {
    if (!this.gcpCanvas) return;
    const canvas = this.gcpCanvas.nativeElement;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const pts = this.gcpPoints();

    Object.entries(pts).forEach(([key, pos]) => {
      if (!pos) return;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 4, 0, 2 * Math.PI);
      ctx.fillStyle = key === this.activeGcpPoint() ? '#ef4444' : '#3b82f6';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
    });

    if (pts['top_left'] && pts['top_right'] && pts['bottom_right'] && pts['bottom_left']) {
      ctx.beginPath();
      ctx.moveTo(pts['top_left'].x, pts['top_left'].y);
      ctx.lineTo(pts['top_right'].x, pts['top_right'].y);
      ctx.lineTo(pts['bottom_right'].x, pts['bottom_right'].y);
      ctx.lineTo(pts['bottom_left'].x, pts['bottom_left'].y);
      ctx.closePath();

      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.fillStyle = 'rgba(59, 130, 246, 0.15)';
      ctx.fill();
      ctx.setLineDash([]);
    }
  }

  private getMousePos(canvas: HTMLCanvasElement, evt: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: evt.clientX - rect.left,
      y: evt.clientY - rect.top
    };
  }

  clearGcp() {
    this.gcpPoints.set({});
    this.drawGcp();
  }

  saveGcp() {
    const active = this.activeGcpCamera();
    if (active) {
        this.api.saveGcp(active.id, this.gcpPoints()).subscribe({
            next: (res) => {
                if (res.status === 'success') {
                    alert('GCP configuration saved to database successfully!');
                    this.loadCameras();
                }
            },
            error: (err) => {
                alert('Error saving GCP: ' + err.message);
            }
        });
    } else {
        alert('Please select a camera first.');
    }
  }
}
