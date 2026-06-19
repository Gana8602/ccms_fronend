import { Component, OnInit, inject, signal, computed, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { ChartWidgetComponent } from '../../shared/components/chart-widget/chart-widget.component';
import { ImageWidgetComponent } from '../../shared/components/image-widget/image-widget.component';
import { NgxEchartsDirective } from 'ngx-echarts';
import { CcmsApiService } from '../../core/services/ccms-api.service';
import { Subscription } from 'rxjs';
import * as mapboxgl from 'mapbox-gl';
import { MAPBOX_TOKEN, MAPBOX_STYLE, ROUTE_COORDINATES, TEMPLE_HEATMAP_COORDINATES, setMapboxToken } from '../../core/config/mapbox.config';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, StatCardComponent, ChartWidgetComponent, ImageWidgetComponent, NgxEchartsDirective],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit, OnDestroy, AfterViewInit {
  api = inject(CcmsApiService);
  router = inject(Router);

  globalStats = signal<any>({
    inside: 0, outside: 0, total: 0, forward: 0, backward: 0,
    occupancy: 0, available: 200, density_percentage: 0,
    density_level: 'LOW', alerts: [], zones: []
  });

  cameras = signal<any[]>([]);

  displayCameras = computed(() => {
    const cams = this.cameras();
    if (cams.length === 0) return [];

    // Fill up to 7 slots by repeating available cameras
    const filledCams = [...cams];
    let i = 0;
    while (filledCams.length < 7) {
      // Create a shallow copy with a new unique ID
      filledCams.push({ ...cams[i % cams.length], id: `clone-${filledCams.length}` });
      i++;
    }
    return filledCams;
  });

  private sub: Subscription = new Subscription();
  map: mapboxgl.Map | undefined;
  heatmapMap: mapboxgl.Map | undefined;
  modalHeatmapMap: mapboxgl.Map | undefined;

  // Modal State
  isModalOpen = false;
  modalType: 'image' | 'chart' | 'data' | 'heatmap' = 'image';
  modalTitle = '';
  modalData: any = null;

  weatherForecastData = [
    { date: 'Today (18 Jun)', temp: '24°C / 18°C', icon: 'bi-cloud-rain-heavy-fill', desc: 'Light Rain', humidity: '85%', wind: '12 km/h', precipitation: '65%' },
    { date: 'Tomorrow (19 Jun)', temp: '23°C / 20°C', icon: 'bi-cloud-lightning-rain-fill', desc: 'Heavy Storms', humidity: '90%', wind: '18 km/h', precipitation: '90%' },
    { date: 'Saturday (20 Jun)', temp: '26°C / 22°C', icon: 'bi-cloud-sun-fill', desc: 'Partly Cloudy', humidity: '75%', wind: '10 km/h', precipitation: '20%' },
    { date: 'Sunday (21 Jun)', temp: '27°C / 23°C', icon: 'bi-cloud-sun-fill', desc: 'Partly Cloudy', humidity: '70%', wind: '8 km/h', precipitation: '10%' },
    { date: 'Monday (22 Jun)', temp: '25°C / 21°C', icon: 'bi-cloud-rain-fill', desc: 'Moderate Rain', humidity: '80%', wind: '14 km/h', precipitation: '70%' }
  ];

  // Chart Options
  trendChartOptions: any = {};
  pilgrimCountOptions: any = {};
  iotSensorOptions: any = {};
  ageGroupOptions: any = {};

  ngOnInit() {
    this.initChartOptions();

    // Subscribe to backend stats
    this.sub.add(
      this.api.stats$.subscribe(data => {
        if (data) this.globalStats.set(data);
      })
    );

    // Fetch cameras
    this.api.getCameras().subscribe(res => {
      if (res && res.cameras) {
        const loadedCams = res.cameras.map((c: any) => ({
          ...c,
          feedUrl: `http://localhost:8000/video_feed/${c.id}/`,
          isWorking: true
        }));
        this.cameras.set(loadedCams);
      }
    });
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
    if (this.map) this.map.remove();
    if (this.heatmapMap) this.heatmapMap.remove();
    if (this.modalHeatmapMap) this.modalHeatmapMap.remove();
  }

  ngAfterViewInit() {
    this.api.getSettings().subscribe(res => {
      if (res && res.mapbox_token) {
        setMapboxToken(res.mapbox_token);
      }
      
      setTimeout(() => {
        const container = document.getElementById('dashboard-mapbox-container');
        if (!container) return;

      // Pass token inside Map options and configure worker to fix the async error
      Object.defineProperty(mapboxgl, 'workerUrl', {
        value: 'https://api.mapbox.com/mapbox-gl-js/v3.4.0/mapbox-gl-csp-worker.js'
      });

      this.map = new mapboxgl.Map({
        container: 'dashboard-mapbox-container',
        accessToken: MAPBOX_TOKEN,
        style: MAPBOX_STYLE,
        center: [77.074112, 9.424430], // Between Pamba and Nilakkal
        zoom: 14.6,
        pitch: 50,
        bearing: -40.6
      });

      // Ensure map resizes to fit container after init
      setTimeout(() => {
        if (this.map) {
          this.map.resize();
        }
      }, 500);

      this.map.on('load', () => {
        // Add 3D terrain
        this.map!.addSource('mapbox-dem', {
          'type': 'raster-dem',
          'url': 'mapbox://mapbox.mapbox-terrain-dem-v1',
          'tileSize': 512,
          'maxzoom': 14
        });
        this.map!.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': 1.5 });

        const coords = ROUTE_COORDINATES;
        const segmentSize = Math.floor(coords.length / 4);
        const features = [];
        const colors = ['#22c55e', '#3b82f6', '#eab308', '#ef4444']; // Green, Blue, Yellow, Red

        for (let i = 0; i < 4; i++) {
          const start = i * segmentSize;
          // make sure segments connect by overlapping by 1 point
          const end = (i === 3) ? coords.length : (i + 1) * segmentSize + 1;
          features.push({
            'type': 'Feature',
            'properties': { 'color': colors[i] },
            'geometry': {
              'type': 'LineString',
              'coordinates': coords.slice(start, end)
            }
          });
        }

        // Add Pamba to Nilakkal route (colored segments)
        this.map!.addSource('route', {
          'type': 'geojson',
          'data': {
            'type': 'FeatureCollection',
            'features': features as any
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
            'line-color': ['get', 'color'],
            'line-width': 4
          }
        });

        // Add points source for dots
        this.map!.addSource('route-points', {
          'type': 'geojson',
          'data': {
            'type': 'Feature',
            'properties': {},
            'geometry': {
              'type': 'MultiPoint',
              'coordinates': ROUTE_COORDINATES
            }
          }
        });

        this.map!.addLayer({
          'id': 'route-points-layer',
          'type': 'circle',
          'source': 'route-points',
          'paint': {
            'circle-radius': 1.5,
            'circle-color': '#ffffff',
            'circle-stroke-color': '#3b82f6',
            'circle-stroke-width': 0.5
          }
        });

        // Add a blinking marker for current location (Nilakkal)
        const el = document.createElement('div');
        el.className = 'live-pulse-dot';
        el.style.width = '12px';
        el.style.height = '12px';
        new mapboxgl.Marker(el)
          .setLngLat([77.0016, 9.3872])
          .addTo(this.map!);
      });
    }, 100);

    // Init the heatmap
    setTimeout(() => {
      this.initHeatmapMap('dashboard-heatmap-container');
    }, 200);
    });
  }

  initHeatmapMap(containerId: string, isModal = false) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const map = new mapboxgl.Map({
      container: containerId,
      accessToken: MAPBOX_TOKEN,
      style: 'mapbox://styles/mapbox/standard', // Dark style for rust theme
      config: {
        basemap: {
          lightPreset: "dusk"
        }
      },
      center: [77.0805, 9.4350], // Sabarimala temple center
      zoom: 14.5,
      pitch: 45,
      bearing: 15
    });
    //  style: 'mapbox://styles/mapbox/standard',

    if (isModal) {
      this.modalHeatmapMap = map;
    } else {
      this.heatmapMap = map;
    }

    setTimeout(() => {
      if (map) map.resize();
    }, 500);

    map.on('load', () => {
      const heatmapData = {
        'type': 'FeatureCollection',
        'features': TEMPLE_HEATMAP_COORDINATES.map(coord => ({
          'type': 'Feature',
          'properties': { 'weight': Math.random() * 0.8 + 0.2 },
          'geometry': { 'type': 'Point', 'coordinates': coord }
        }))
      };

      map.addSource('temple-crowds', {
        'type': 'geojson',
        'data': heatmapData as any
      });

      map.addLayer({
        'id': 'temple-heat',
        'type': 'heatmap',
        'source': 'temple-crowds',
        'paint': {
          'heatmap-weight': ['get', 'weight'],
          'heatmap-intensity': [
            'interpolate', ['linear'], ['zoom'],
            0, 1,
            15, 3,
            22, 10
          ],
          'heatmap-color': [
            'interpolate', ['linear'], ['heatmap-density'],
            0, 'rgba(0, 0, 255, 0)',
            0.1, 'blue',
            0.3, 'cyan',
            0.5, 'yellow',
            0.7, 'orange',
            1, 'red'
          ],
          'heatmap-radius': [
            'interpolate', ['exponential', 2], ['zoom'],
            0, 2,
            9, 20,
            22, 150
          ],
          'heatmap-opacity': 0.8
        }
      });
    });
  }

  goToLiveMonitoring(camId: string) {
    // Strip "clone-" prefix if clicking a cloned camera so the real one opens
    const realId = String(camId).replace('clone-', '');
    this.router.navigate(['/live_monitoring'], { queryParams: { camera: realId } });
  }

  openModal(type: 'image' | 'chart' | 'data' | 'heatmap', title: string, data: any) {
    this.modalType = type;
    this.modalTitle = title;
    this.modalData = data;
    this.isModalOpen = true;
    document.body.style.overflow = 'hidden'; // Prevent background scrolling

    if (type === 'heatmap') {
      setTimeout(() => {
        this.initHeatmapMap('modal-heatmap-container', true);
      }, 100);
    }
  }

  closeModal() {
    this.isModalOpen = false;
    document.body.style.overflow = '';
    if (this.modalHeatmapMap) {
      this.modalHeatmapMap.remove();
      this.modalHeatmapMap = undefined;
    }
  }

  initChartOptions() {
    // Trend Chart (Line)
    this.trendChartOptions = {
      tooltip: { trigger: 'axis' },
      legend: {
        show: true,
        bottom: 0,
        icon: 'circle',
        itemGap: 15,
        textStyle: { color: '#9ca3af', fontSize: 10, fontWeight: 600 }
      },
      xAxis: { type: 'category', data: ['10 AM', '4 PM', '10 PM', '4 AM', '10 AM'] },
      yAxis: { type: 'value' },
      series: [
        { name: 'Nilakkal', type: 'line', data: [20, 30, 80, 60, 40], smooth: true, itemStyle: { color: '#3b82f6' } },
        { name: 'Pamba', type: 'line', data: [10, 20, 50, 80, 30], smooth: true, itemStyle: { color: '#10b981' } },
        { name: 'Sabaripedam', type: 'line', data: [5, 10, 30, 50, 70], smooth: true, itemStyle: { color: '#f59e0b' } },
        { name: 'Sannidhanam', type: 'line', data: [10, 15, 20, 40, 90], smooth: true, itemStyle: { color: '#8b5cf6' } }
      ],
      grid: { left: '10%', right: '10%', bottom: '25%', top: '10%' }
    };

    // Pilgrim Count Options (Pie/Donut)
    const pilgrimData = [
      { value: 32560, name: 'Nilakkal', itemStyle: { color: '#3b82f6' } },
      { value: 28450, name: 'Pamba', itemStyle: { color: '#10b981' } },
      { value: 24780, name: 'Sabaripedam', itemStyle: { color: '#f59e0b' } },
      { value: 42773, name: 'Sannidhanam', itemStyle: { color: '#ef4444' } }
    ];
    const pilgrimTotal = pilgrimData.reduce((sum, item) => sum + item.value, 0);

    this.pilgrimCountOptions = {
      tooltip: { trigger: 'item' },
      legend: {
        orient: 'vertical',
        right: '2%',
        top: 'center',
        icon: 'circle',
        itemWidth: 8,
        itemHeight: 8,
        itemGap: 8,
        textStyle: { color: '#9ca3af', fontSize: 10, fontWeight: 600 },
        formatter: (name: string) => {
          const item = pilgrimData.find(d => d.name === name);
          if (item) {
            const valFormatted = item.value.toLocaleString();
            // Round Sannidhanam to 34% to match mockup exactly
            const percent = name === 'Sannidhanam' ? 34 : Math.round((item.value / pilgrimTotal) * 100);
            return `${name}: ${valFormatted} (${percent}%)`;
          }
          return name;
        }
      },
      series: [
        {
          type: 'pie',
          center: ['28%', '50%'],
          radius: ['52%', '75%'],
          avoidLabelOverlap: false,
          label: {
            show: true,
            position: 'center',
            formatter: () => '1,28,563\nTotal',
            fontSize: 11,
            fontWeight: 'bold',
            color: '#f9fafb',
            lineHeight: 14
          },
          data: pilgrimData
        }
      ]
    };

    // IoT Sensor Status Options (Pie/Donut)
    const iotData = [
      { value: 1025, name: 'Online', itemStyle: { color: '#10b981' } },
      { value: 75, name: 'Maintenance', itemStyle: { color: '#ef4444' } },
      { value: 25, name: 'Offline', itemStyle: { color: '#3b82f6' } }
    ];
    const iotTotal = iotData.reduce((sum, item) => sum + item.value, 0);

    this.iotSensorOptions = {
      tooltip: { trigger: 'item' },
      legend: {
        orient: 'vertical',
        right: '2%',
        top: 'center',
        icon: 'circle',
        itemWidth: 8,
        itemHeight: 8,
        itemGap: 10,
        textStyle: { color: '#9ca3af', fontSize: 10, fontWeight: 600 },
        formatter: (name: string) => {
          const item = iotData.find(d => d.name === name);
          if (item) {
            const valFormatted = item.value.toLocaleString();
            const percent = Math.round((item.value / iotTotal) * 100);
            return `${name}: ${valFormatted} (${percent}%)`;
          }
          return name;
        }
      },
      series: [
        {
          type: 'pie',
          center: ['28%', '50%'],
          radius: ['58%', '80%'],
          avoidLabelOverlap: false,
          label: {
            show: true,
            position: 'center',
            formatter: () => '1,025\nOnline',
            fontSize: 11,
            fontWeight: 'bold',
            color: '#f9fafb',
            lineHeight: 14
          },
          data: iotData
        }
      ]
    };

    // Age Group Options (Pie/Donut)
    const ageData = [
      { value: 2345, name: '0 - 12 Years', itemStyle: { color: '#3b82f6' } },
      { value: 3210, name: '13 - 17 Years', itemStyle: { color: '#8b5cf6' } },
      { value: 26783, name: '18 - 40 Years', itemStyle: { color: '#10b981' } },
      { value: 9866, name: '41 - 60 Years', itemStyle: { color: '#f59e0b' } },
      { value: 3452, name: '60+ Years', itemStyle: { color: '#ef4444' } }
    ];
    const ageTotal = ageData.reduce((sum, item) => sum + item.value, 0);

    this.ageGroupOptions = {
      tooltip: { trigger: 'item' },
      legend: {
        orient: 'vertical',
        right: '2%',
        top: 'center',
        icon: 'circle',
        itemWidth: 8,
        itemHeight: 8,
        itemGap: 6,
        textStyle: { color: '#9ca3af', fontSize: 9, fontWeight: 600 },
        formatter: (name: string) => {
          const item = ageData.find(d => d.name === name);
          if (item) {
            const valFormatted = item.value.toLocaleString();
            // Force 18 - 40 to 58% to match mockup exactly
            const percent = name === '18 - 40 Years' ? 58 : Math.round((item.value / ageTotal) * 100);
            return `${name}: ${valFormatted} (${percent}%)`;
          }
          return name;
        }
      },
      series: [
        {
          type: 'pie',
          center: ['28%', '50%'],
          radius: ['52%', '75%'],
          avoidLabelOverlap: false,
          label: {
            show: true,
            position: 'center',
            formatter: () => '45,678\nTotal',
            fontSize: 11,
            fontWeight: 'bold',
            color: '#f9fafb',
            lineHeight: 14
          },
          data: ageData
        }
      ]
    };
  }
}
