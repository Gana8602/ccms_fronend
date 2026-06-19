import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, timer } from 'rxjs';
import { switchMap, shareReplay } from 'rxjs/operators';

export interface CcmsStats {
  inside: number;
  outside: number;
  total: number;
  forward: number;
  backward: number;
  occupancy: number;
  available: number;
  density_percentage: number;
  density_level: string;
  alerts: string[];
  zones: any[];
}

export interface FaceObservation {
  person_id?: string;
  label?: string;
  image_url: string;
  first_seen?: string;
  last_seen?: string;
  timestamp?: string;
  seen_count?: number;
}

@Injectable({
  providedIn: 'root'
})
export class CcmsApiService {
  private http = inject(HttpClient);

  // Poll stats every 2 seconds
  public stats$: Observable<CcmsStats> = timer(0, 2000).pipe(
    switchMap(() => this.http.get<CcmsStats>('/api/counts/')),
    shareReplay(1)
  );

  getKnownFaces(): Observable<{faces: FaceObservation[]}> {
    return this.http.get<{faces: FaceObservation[]}>('/api/faces/known/');
  }

  getMaskedFaces(): Observable<{faces: FaceObservation[]}> {
    return this.http.get<{faces: FaceObservation[]}>('/api/faces/masked/');
  }

  setViewMode(aiView: boolean): Observable<any> {
    return this.http.post('/api/view-mode/', { ai_view: aiView });
  }

  getZones(): Observable<any> {
    return this.http.get('/api/zones/');
  }

  saveZones(zones: any[]): Observable<any> {
    return this.http.post('/api/zones/', { zones });
  }

  inspectFace(imageBase64: string) {
    return this.http.post<{id: string, match_img: string}>('/api/faces/inspect/', { image: imageBase64 });
  }

  getCameras(): Observable<any> {
    return this.http.get('/api/cameras/');
  }

  addCamera(name: string, url: string): Observable<any> {
    return this.http.post('/api/cameras/', { name, url });
  }

  deleteCamera(id: string): Observable<any> {
    return this.http.delete(`/api/cameras/${id}/`);
  }

  saveGcp(id: string, gcpPoints: any): Observable<any> {
    return this.http.post(`/api/cameras/${id}/gcp/`, { gcp_points: gcpPoints });
  }

  getSettings(): Observable<any> {
    return this.http.get('/api/settings/');
  }
}
