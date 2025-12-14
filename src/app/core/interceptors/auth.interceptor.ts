import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  // لو عندك endpoints مش محتاجة توكن (مثلاً login/register) استثنيها
  const publicEndpoints = ['/api/Auth/login', '/api/Auth/register'];
  const isPublic = publicEndpoints.some(p => req.url.includes(p));
  if (isPublic) return next(req);

  const token = auth.getAccessToken?.();
  if (!token) return next(req);

  const cloned = req.clone({
    setHeaders: { Authorization: `Bearer ${token}` },
  });

  return next(cloned);
};
