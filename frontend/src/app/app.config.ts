import { ApplicationConfig, importProvidersFrom, inject, provideAppInitializer, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader, TRANSLATE_HTTP_LOADER_CONFIG } from '@ngx-translate/http-loader';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { AuthService } from './core/services/auth.service';

export const appConfig: ApplicationConfig = {
  providers: [
    // The access token only lives in memory, so after a reload we get a new one from the
    // refresh cookie before any guard runs.
    provideAppInitializer(() => inject(AuthService).refreshToken().then(() => undefined)),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    {
      provide: TRANSLATE_HTTP_LOADER_CONFIG,
      useValue: { prefix: '/assets/i18n/', suffix: '.json' },
    },
    importProvidersFrom(
      TranslateModule.forRoot({
        fallbackLang: 'es',
        loader: {
          provide: TranslateLoader,
          useClass: TranslateHttpLoader,
        },
      })
    ),
  ],
};
