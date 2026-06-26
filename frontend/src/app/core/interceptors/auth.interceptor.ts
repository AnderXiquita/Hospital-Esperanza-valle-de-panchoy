import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError, from } from 'rxjs';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const isApiRequest = req.url.startsWith(environment.apiUrl);

  // Attach Bearer token and credentials to API requests
  let outReq = isApiRequest ? req.clone({ withCredentials: true }) : req;
  const token = authService.getAccessToken();
  if (token && isApiRequest) {
    outReq = outReq.clone({ headers: outReq.headers.set('Authorization', `Bearer ${token}`) });
  }

  return next(outReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // On 401 outside auth routes, try to refresh the token once
      if (error.status === 401 && !req.url.includes('/auth/')) {
        return from(authService.refreshToken()).pipe(
          switchMap(newToken => {
            if (newToken) {
              const retryReq = req.clone({
                withCredentials: true,
                headers: req.headers.set('Authorization', `Bearer ${newToken}`),
              });
              return next(retryReq);
            }
            router.navigate(['/auth/login']);
            return throwError(() => error);
          })
        );
      }
      return throwError(() => error);
    })
  );
};
