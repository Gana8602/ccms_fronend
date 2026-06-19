import { Component, ElementRef, OnInit, ViewChild, OnDestroy, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import * as mapboxgl from 'mapbox-gl';
import { MAPBOX_TOKEN, MAPBOX_STYLE } from '../../core/config/mapbox.config';

@Component({
  selector: 'app-map',
  standalone: true,
  template: `<div #mapContainer class="w-full h-full"></div>`,
  styles: ``
})
export class MapComponent implements OnInit, OnDestroy {
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;
  map!: mapboxgl.Map;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      Object.defineProperty(mapboxgl, 'accessToken', {
        value: MAPBOX_TOKEN,
        writable: true
      });
      
      this.map = new mapboxgl.Map({
        container: this.mapContainer.nativeElement,
        style: MAPBOX_STYLE,
        center: [77.0818, 9.4398], // approximate Sabarimala coordinates
        zoom: 13,
        pitch: 60,
        bearing: -20,
        antialias: true
      });

      this.map.on('load', () => {
        // Add 3D terrain if using a compatible style
        try {
          this.map.addSource('mapbox-dem', {
            'type': 'raster-dem',
            'url': 'mapbox://mapbox.mapbox-terrain-dem-v1',
            'tileSize': 512,
            'maxzoom': 14
          });
          this.map.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': 1.5 });
          
          // Add fog
          this.map.setFog({
            'range': [-1, 2],
            'color': '#0f172a', // matches dark navy
            'horizon-blend': 0.1
          });
        } catch (e) {
          console.log('Terrain source requires a valid Mapbox token.');
        }
        
        this.addMockMarkers();
      });
    }
  }

  addMockMarkers() {
    const el = document.createElement('div');
    el.className = 'w-4 h-4 bg-neon-cyan rounded-full shadow-[0_0_15px_#00f2fe] animate-pulse border-2 border-white';
    
    new mapboxgl.Marker(el)
      .setLngLat([77.0818, 9.4398])
      .addTo(this.map);
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
    }
  }
}
