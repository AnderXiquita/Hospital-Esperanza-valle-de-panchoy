import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SystemConfig {
  hospitalNombre:    string;
  hospitalTelefono:  string;
  hospitalDireccion: string;
  citaDuracion:      number;
  horarioApertura:   string;
  horarioCierre:     string;
  zonaHoraria:       string;
  moneda:            string;
}

export const DEFAULT_SYS_CONFIG: SystemConfig = {
  hospitalNombre:    'Hospital Esperanza Valle de Panchoy',
  hospitalTelefono:  '',
  hospitalDireccion: 'Antigua Guatemala, Guatemala',
  citaDuracion:      30,
  horarioApertura:   '07:00',
  horarioCierre:     '20:00',
  zonaHoraria:       'America/Guatemala',
  moneda:            'GTQ',
};

const LS_KEY = 'hospital_system_config';

@Injectable({ providedIn: 'root' })
export class ConfiguracionService {
  private http = inject(HttpClient);

  // Inicia desde localStorage como caché inmediata; se reemplaza con el valor de la API
  readonly config = signal<SystemConfig>(this.fromStorage());

  private fromStorage(): SystemConfig {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? { ...DEFAULT_SYS_CONFIG, ...JSON.parse(raw) } : { ...DEFAULT_SYS_CONFIG };
    } catch { return { ...DEFAULT_SYS_CONFIG }; }
  }

  // Llamar al iniciar la app — carga la config real desde la BD
  async init(): Promise<void> {
    try {
      const cfg = await firstValueFrom(
        this.http.get<SystemConfig>(`${environment.apiUrl}/api/config`)
      );
      const merged = { ...DEFAULT_SYS_CONFIG, ...cfg };
      this.config.set(merged);
      localStorage.setItem(LS_KEY, JSON.stringify(merged));
    } catch {
      // Fallback: el signal ya tiene el valor de localStorage
    }
  }

  async guardar(data: SystemConfig): Promise<void> {
    const updated = await firstValueFrom(
      this.http.put<SystemConfig>(`${environment.apiUrl}/api/config`, data)
    );
    const merged = { ...DEFAULT_SYS_CONFIG, ...updated };
    this.config.set(merged);
    localStorage.setItem(LS_KEY, JSON.stringify(merged));
  }
}
