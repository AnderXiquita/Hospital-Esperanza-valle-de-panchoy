import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AuthUser {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  rol: string;
}

interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  private _accessToken: string | null = null;
  private _user = signal<AuthUser | null>(null);

  readonly user = this._user.asReadonly();

  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await firstValueFrom(
      this.http.post<LoginResponse>(
        `${this.api}/auth/login`,
        { email, password },
        { withCredentials: true }
      )
    );
    this._accessToken = response.accessToken;
    this._user.set(response.user);
    return response;
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post(`${this.api}/auth/logout`, {}, { withCredentials: true })
      );
    } finally {
      this._accessToken = null;
      this._user.set(null);
    }
  }

  async refreshToken(): Promise<string | null> {
    try {
      const response = await firstValueFrom(
        this.http.post<{ accessToken: string }>(
          `${this.api}/auth/refresh`,
          {},
          { withCredentials: true }
        )
      );
      this._accessToken = response.accessToken;
      return response.accessToken;
    } catch {
      this._accessToken = null;
      this._user.set(null);
      return null;
    }
  }

  getAccessToken(): string | null {
    return this._accessToken;
  }

  isAuthenticated(): boolean {
    return this._accessToken !== null;
  }

  async updateProfile(nombre: string, apellido: string, email: string): Promise<void> {
    const updated = await firstValueFrom(
      this.http.patch<{ nombre: string; apellido: string; email: string }>(
        `${this.api}/auth/me`,
        { nombre, apellido, email },
        { withCredentials: true }
      )
    );
    const current = this._user();
    if (current) {
      this._user.set({ ...current, nombre: updated.nombre, apellido: updated.apellido, email: updated.email });
    }
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await firstValueFrom(
      this.http.patch(
        `${this.api}/auth/change-password`,
        { currentPassword, newPassword },
        { withCredentials: true }
      )
    );
  }
}
