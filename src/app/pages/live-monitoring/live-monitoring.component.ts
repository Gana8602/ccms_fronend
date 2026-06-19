import { Component, signal, OnInit, AfterViewInit, ViewChild, ElementRef, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { CcmsApiService, CcmsStats, FaceObservation } from '../../core/services/ccms-api.service';
import { Subscription } from 'rxjs';
import * as mapboxgl from 'mapbox-gl';
import { MAPBOX_TOKEN, MAPBOX_STYLE, ROUTE_COORDINATES, setMapboxToken } from '../../core/config/mapbox.config';

interface Camera {
  id: string;
  name: string;
  status: 'online' | 'offline';
  feedUrl: string;
  isWorking: boolean;
  count: number;
}

@Component({
  selector: 'app-live-monitoring',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './live-monitoring.component.html',
  styles: [`
    .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }
    .animate-fade-in { animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
    
    .animate-slide-left { animation: slideLeft 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    @keyframes slideLeft { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }

    @keyframes scan { 0% { top: 0; } 100% { top: 100%; } }
    @keyframes dash { to { stroke-dashoffset: -40; } }
    
    .toolbar-enter { transform: translateX(120%); opacity: 0; }
    .toolbar-enter-active { transform: translateX(0); opacity: 1; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
  `]
})
export class LiveMonitoringComponent implements OnInit, AfterViewInit, OnDestroy {
  private api = inject(CcmsApiService);
  private route = inject(ActivatedRoute);
  private sub = new Subscription();

  // Main grid cameras
  cameras = signal<Camera[]>([]);
  
  // Modals state
  selectedCamera = signal<Camera | null>(null);
  
  // Toolbar & Modes state
  showToolbar = signal<boolean>(false);
  activeViewMode = signal<'clear'|'ai'>('clear');
  zonesEnabled = signal<boolean>(false);
  personInspectEnabled = signal<boolean>(false);

  // Stats from backend
  globalStats = signal<CcmsStats | null>(null);

  // Person Inspect State
  inspectedPerson = signal<{ sourceImg: string, matchImg: string, isScanning: boolean, id: string, time: string, showTime: boolean, showMap: boolean } | null>(null);

  // Zone Drawing State
  @ViewChild('zoneCanvas') zoneCanvas!: ElementRef<HTMLCanvasElement>;
  selectedZoneColor = signal<string>('#22c55e'); // Default green
  customZones = signal<{name: string, color_hex: string, points: {x:number, y:number}[]}[]>([]);
  isDrawingZone = false;
  zoneStartPos = { x: 0, y: 0 };
  zoneCurrentPos = { x: 0, y: 0 };

  // Crop Tool State
  isCropping = false;
  cropStartPos = { x: 0, y: 0 };
  cropCurrentPos = { x: 0, y: 0 };
  
  // Analytics
  knownFaces = signal<FaceObservation[]>([]);
  maskedFaces = signal<FaceObservation[]>([]);
  
  ngOnInit() {
    // Generate cameras for grid (Only first one uses real stream)
    this.api.getCameras().subscribe(res => {
      if (res && res.cameras) {
        const loadedCams: Camera[] = res.cameras.map((c: any) => ({
          id: c.id,
          name: c.name,
          status: 'online',
          feedUrl: `/video_feed/${c.id}/`,
          isWorking: true,
          count: 0
        }));
        this.cameras.set(loadedCams);
        
        // Auto-select camera if query param is present
        this.sub.add(
          this.route.queryParams.subscribe(params => {
            if (params['camera']) {
              const cam = loadedCams.find(c => String(c.id) === String(params['camera']));
              if (cam) {
                this.openCameraDetail(cam);
              }
            }
          })
        );
      }
    });

    // Fetch backend zones initially
    this.fetchZones();

    // Poll stats
    this.sub.add(
      this.api.stats$.subscribe(data => {
        this.globalStats.set(data);
        // Update main camera count if available
        if (this.cameras().length > 0 && data) {
           const updated = [...this.cameras()];
           updated[0].count = data.total;
           this.cameras.set(updated);
        }
      })
    );

    // Initial fetch for faces
    this.fetchFaces();
    // Poll faces every 5s
    setInterval(() => this.fetchFaces(), 5000);
  }

  fetchFaces() {
    this.api.getKnownFaces().subscribe(res => this.knownFaces.set(res.faces));
    this.api.getMaskedFaces().subscribe(res => this.maskedFaces.set(res.faces));
  }

  fetchZones() {
    this.api.getZones().subscribe(res => {
      if (res.zones) {
        // Map backend points [x,y][] to {x,y}[]
        const mappedZones = res.zones.map((z: any) => ({
          name: z.name,
          color_hex: z.color_hex,
          points: z.points.map((p: number[]) => ({x: p[0], y: p[1]}))
        }));
        this.customZones.set(mappedZones);
        this.drawZones();
      }
    });
  }

  deleteZone(index: number) {
    const newZones = [...this.customZones()];
    newZones.splice(index, 1);
    this.customZones.set(newZones);
    const backendZones = newZones.map(z => ({
      name: z.name,
      color_hex: z.color_hex,
      points: z.points.map(p => [p.x, p.y])
    }));
    this.api.saveZones(backendZones).subscribe();
  }

  getZoneCount(name: string): number {
    const zones = this.globalStats()?.zones;
    if (!zones) return 0;
    const match = zones.find((z: any) => z.name === name);
    return match ? match.count : 0;
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  toggleViewMode(mode: 'clear'|'ai') {
    this.activeViewMode.set(mode);
    this.api.setViewMode(mode === 'ai').subscribe();
  }

  ngAfterViewInit() {
    this.drawZones();
  }

  openCameraDetail(cam: Camera) {
    if (!cam.isWorking) return;
    this.selectedCamera.set(cam);
    this.showToolbar.set(false);
    setTimeout(() => this.drawZones(), 50);
  }

  closeCameraDetail() {
    this.selectedCamera.set(null);
  }

  toggleToolbar() {
    this.showToolbar.set(!this.showToolbar());
  }

  // --- ZONE & INSPECT DRAWING LOGIC ---
  frozenFrameData: string | null = null;
  videoScaleX = 1;
  videoScaleY = 1;

  togglePersonInspect() {
    this.personInspectEnabled.set(!this.personInspectEnabled());
    if (this.personInspectEnabled()) {
       // Freeze the current frame
       try {
         const videoImgElement = this.zoneCanvas.nativeElement.previousElementSibling as HTMLImageElement;
         if (videoImgElement && videoImgElement.tagName === 'IMG') {
           const tmpCanvas = document.createElement('canvas');
           tmpCanvas.width = videoImgElement.naturalWidth || videoImgElement.width;
           tmpCanvas.height = videoImgElement.naturalHeight || videoImgElement.height;
           
           const ctx = tmpCanvas.getContext('2d');
           if (ctx) {
             ctx.drawImage(videoImgElement, 0, 0, tmpCanvas.width, tmpCanvas.height);
             this.frozenFrameData = tmpCanvas.toDataURL('image/png');
           }
         }
       } catch (err) {
         console.warn("Could not freeze feed (CORS/Tainted).");
       }
    } else {
       this.frozenFrameData = null;
       this.closePersonInspect();
       this.drawZones(); // Clear canvas
    }
  }

  closePersonInspect() {
    this.inspectedPerson.set(null);
  }

  // Mouse handlers for both Zone and Crop tool
  onZoneMouseDown(e: MouseEvent) {
    const pos = this.getMousePos(this.zoneCanvas.nativeElement, e);
    
    if (this.personInspectEnabled()) {
      this.isCropping = true;
      this.cropStartPos = pos;
      this.cropCurrentPos = pos;
      return;
    }

    if (this.zonesEnabled()) {
      this.isDrawingZone = true;
      this.zoneStartPos = pos;
      this.zoneCurrentPos = pos;
    }
  }

  onZoneMouseMove(e: MouseEvent) {
    const pos = this.getMousePos(this.zoneCanvas.nativeElement, e);
    
    if (this.isCropping) {
      this.cropCurrentPos = pos;
      this.drawZones();
      return;
    }

    if (this.isDrawingZone) {
      this.zoneCurrentPos = pos;
      this.drawZones();
    }
  }

  onZoneMouseUp(e: MouseEvent) {
    if (this.isCropping) {
      this.isCropping = false;
      this.drawZones(); // clear the temporary crop box
      
      const w = Math.abs(this.cropCurrentPos.x - this.cropStartPos.x);
      const h = Math.abs(this.cropCurrentPos.y - this.cropStartPos.y);
      if (w > 20 && h > 20) {
        this.performCropCapture();
      }
      return;
    }

    if (this.isDrawingZone) {
      this.isDrawingZone = false;
      const w = Math.abs(this.zoneCurrentPos.x - this.zoneStartPos.x);
      const h = Math.abs(this.zoneCurrentPos.y - this.zoneStartPos.y);
      if (w > 10 && h > 10) {
         const x = Math.min(this.zoneStartPos.x, this.zoneCurrentPos.x);
         const y = Math.min(this.zoneStartPos.y, this.zoneCurrentPos.y);
         const name = prompt("Enter Zone Name:");
         if (!name || name.trim() === '') {
           this.drawZones();
           return;
         }

         const videoImgElement = this.zoneCanvas.nativeElement.previousElementSibling as HTMLImageElement;
         
         // Convert rect to backend polygon format
         const points = [
           this.mapToVideoCoords({x: x, y: y}, videoImgElement),
           this.mapToVideoCoords({x: x+w, y: y}, videoImgElement),
           this.mapToVideoCoords({x: x+w, y: y+h}, videoImgElement),
           this.mapToVideoCoords({x: x, y: y+h}, videoImgElement)
         ];
         
         const newZones = [...this.customZones(), { name: name.trim(), color_hex: this.selectedZoneColor(), points }];
         this.customZones.set(newZones);
         
         const backendZones = newZones.map(z => ({
            name: z.name,
            color_hex: z.color_hex,
            points: z.points.map(p => [p.x, p.y])
         }));
         this.api.saveZones(backendZones).subscribe();
      }
      this.drawZones();
    }
  }

  performCropCapture() {
    let croppedImage = 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=300&auto=format&fit=crop';
    try {
      const videoImgElement = this.zoneCanvas.nativeElement.previousElementSibling as HTMLImageElement;
      const tmpCanvas = document.createElement('canvas');
      const cx = Math.min(this.cropStartPos.x, this.cropCurrentPos.x);
      const cy = Math.min(this.cropStartPos.y, this.cropCurrentPos.y);
      const cw = Math.abs(this.cropCurrentPos.x - this.cropStartPos.x);
      const ch = Math.abs(this.cropCurrentPos.y - this.cropStartPos.y);

      const topLeft = this.mapToVideoCoords({x: cx, y: cy}, videoImgElement);
      const botRight = this.mapToVideoCoords({x: cx+cw, y: cy+ch}, videoImgElement);

      const sourceX = Math.max(0, topLeft.x);
      const sourceY = Math.max(0, topLeft.y);
      const sourceW = Math.max(1, botRight.x - topLeft.x);
      const sourceH = Math.max(1, botRight.y - topLeft.y);

      tmpCanvas.width = sourceW;
      tmpCanvas.height = sourceH;
      const ctx = tmpCanvas.getContext('2d');
      
      if (ctx && videoImgElement) {
        if (this.frozenFrameData) {
          const frozenImg = new Image();
          frozenImg.src = this.frozenFrameData;
          ctx.drawImage(frozenImg, sourceX, sourceY, sourceW, sourceH, 0, 0, sourceW, sourceH);
        } else {
          ctx.drawImage(videoImgElement, sourceX, sourceY, sourceW, sourceH, 0, 0, sourceW, sourceH);
        }
        croppedImage = tmpCanvas.toDataURL('image/png');
      }
    } catch (err) {
      console.warn("Could not dynamically crop feed (CORS/Tainted). Falling back.");
    }

    // Trigger the scanner sequence
    this.inspectedPerson.set({
      sourceImg: croppedImage,
      matchImg: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=150&auto=format&fit=crop',
      isScanning: true,
      id: 'SCANNING...',
      time: '--:--',
      showTime: false,
      showMap: false
    });

    const mockFaces = [
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=150&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1552058544-f2b08422138a?q=80&w=150&auto=format&fit=crop'
    ];

    let shuffleTicks = 0;
    const shuffleInterval = setInterval(() => {
      this.inspectedPerson.update(p => p ? {...p, matchImg: mockFaces[shuffleTicks % mockFaces.length]} : null);
      shuffleTicks++;
    }, 150);

    // Call backend API for real face matching
    this.api.inspectFace(croppedImage).subscribe({
      next: (res) => {
        clearInterval(shuffleInterval);
        const now = new Date();
        now.setMinutes(now.getMinutes() - Math.floor(Math.random() * 60)); // Random entry time
        this.inspectedPerson.update(p => p ? {
          ...p,
          isScanning: false,
          matchImg: res.match_img || 'assets/images/unknown_avatar.png',
          id: res.id,
          time: now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
        } : null);
        
        setTimeout(() => this.inspectedPerson.update(p => p ? {...p, showTime: true} : null), 400);
        setTimeout(() => this.inspectedPerson.update(p => p ? {...p, showMap: true} : null), 800);
        setTimeout(() => this.initMapbox(), 1000); // Initialize Mapbox after DOM reveals
      },
      error: (err) => {
        clearInterval(shuffleInterval);
        this.inspectedPerson.update(p => p ? {...p, isScanning: false, id: 'ERROR'} : null);
      }
    });
  }

  map: mapboxgl.Map | null = null;

  initMapbox() {
    if (MAPBOX_TOKEN) {
      this._doInitMapbox();
    } else {
      this.api.getSettings().subscribe(res => {
        if (res && res.mapbox_token) {
          setMapboxToken(res.mapbox_token);
          this._doInitMapbox();
        }
      });
    }
  }

  _doInitMapbox() {
    const container = document.getElementById('mapbox-container');
    if (!container) return;

    // Pass token inside Map options and configure worker to fix the async error
    Object.defineProperty(mapboxgl, 'workerUrl', {
      value: 'https://api.mapbox.com/mapbox-gl-js/v3.4.0/mapbox-gl-csp-worker.js'
    });

    this.map = new mapboxgl.Map({
      container: 'mapbox-container',
      accessToken: MAPBOX_TOKEN,
      style: MAPBOX_STYLE,
      center: [77.0439, 9.3970], // Between Pamba and Nilakkal
      zoom: 11.5,
      pitch: 45,
      bearing: -17.6
    });

    this.map.on('load', () => {
      // Add 3D terrain
      this.map!.addSource('mapbox-dem', {
        'type': 'raster-dem',
        'url': 'mapbox://mapbox.mapbox-terrain-dem-v1',
        'tileSize': 512,
        'maxzoom': 14
      });
      this.map!.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': 1.5 });

      // Add Pamba to Nilakkal route
      this.map!.addSource('route', {
        'type': 'geojson',
        'data': {
          'type': 'Feature',
          'properties': {},
          'geometry': {
            'type': 'LineString',
            'coordinates': ROUTE_COORDINATES
          }
        }
      });

      this.map!.addLayer({
        'id': 'route',
        'type': 'line',
        'source': 'route',
        'layout': {
          'line-join': 'round',
          'line-cap': 'round'
        },
        'paint': {
          'line-color': '#3b82f6',
          'line-width': 4
        }
      });

      // Add a blinking marker for current location (Nilakkal)
      const el = document.createElement('div');
      el.className = 'w-3 h-3 bg-red-500 rounded-full animate-ping shadow-[0_0_10px_rgba(239,68,68,0.8)]';
      new mapboxgl.Marker(el)
        .setLngLat([77.0016, 9.3872])
        .addTo(this.map!);
    });
  }

  drawZones() {
    if (!this.zoneCanvas) return;
    const canvas = this.zoneCanvas.nativeElement;
    // Set actual canvas resolution to match display size to avoid blur
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Note: We no longer draw saved zones (this.customZones) on the frontend canvas
    // because the backend natively draws them onto the RTSP video feed itself.
    // If we draw them here, they will overlap incorrectly with the video feed.

    // Draw current drawing zone
    if (this.isDrawingZone) {
       const x = Math.min(this.zoneStartPos.x, this.zoneCurrentPos.x);
       const y = Math.min(this.zoneStartPos.y, this.zoneCurrentPos.y);
       const w = Math.abs(this.zoneCurrentPos.x - this.zoneStartPos.x);
       const h = Math.abs(this.zoneCurrentPos.y - this.zoneStartPos.y);
       ctx.strokeStyle = this.selectedZoneColor();
       ctx.lineWidth = 2;
       ctx.strokeRect(x, y, w, h);
    }

    // Draw current crop tool region
    if (this.isCropping) {
       const x = Math.min(this.cropStartPos.x, this.cropCurrentPos.x);
       const y = Math.min(this.cropStartPos.y, this.cropCurrentPos.y);
       const w = Math.abs(this.cropCurrentPos.x - this.cropStartPos.x);
       const h = Math.abs(this.cropCurrentPos.y - this.cropStartPos.y);
       
       // Draw darkened overlay
       ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
       ctx.fillRect(0, 0, canvas.width, y); // Top
       ctx.fillRect(0, y, x, h); // Left
       ctx.fillRect(x + w, y, canvas.width - (x + w), h); // Right
       ctx.fillRect(0, y + h, canvas.width, canvas.height - (y + h)); // Bottom

       // Draw selection box
       ctx.strokeStyle = '#3b82f6'; // primary-blue
       ctx.lineWidth = 2;
       ctx.setLineDash([5, 5]);
       ctx.strokeRect(x, y, w, h);
       ctx.setLineDash([]);
    }
  }

  private mapToVideoCoords(pos: {x:number, y:number}, videoEl: HTMLImageElement): {x:number, y:number} {
    const cw = videoEl.clientWidth;
    const ch = videoEl.clientHeight;
    const nw = videoEl.naturalWidth || 1280;
    const nh = videoEl.naturalHeight || 720;
    
    const imgRatio = nw / nh;
    const containerRatio = cw / ch;
    
    let renderedW = cw;
    let renderedH = ch;
    let offsetX = 0;
    let offsetY = 0;
    
    if (containerRatio > imgRatio) {
      renderedW = ch * imgRatio;
      offsetX = (cw - renderedW) / 2;
    } else {
      renderedH = cw / imgRatio;
      offsetY = (ch - renderedH) / 2;
    }
    
    const scaleX = nw / renderedW;
    const scaleY = nh / renderedH;
    
    return {
      x: Math.round((pos.x - offsetX) * scaleX),
      y: Math.round((pos.y - offsetY) * scaleY)
    };
  }

  private getMousePos(canvas: HTMLCanvasElement, evt: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: evt.clientX - rect.left,
      y: evt.clientY - rect.top
    };
  }
}
