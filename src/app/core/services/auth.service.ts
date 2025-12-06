import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type UserRole = 'Manager' | 'Customer';

interface RegisterData {
  role: UserRole | null;
  fullName: string | null;
  email: string | null;
  companyName: string | null;
  latitude: number | null;
  longitude: number | null;
  profilePicture: File | null;
}

interface AuthSession {
  fullName: string;
  email: string;
  role: UserRole | null;
  token: string;
  avatarUrl?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private baseUrl = 'https://chainly.azurewebsites.net/api/Authentication';

  // بيانات الريجستر لحد ما يكمّل كل الستيبس
  private registerData: RegisterData = {
    role: null,
    fullName: null,
    email: null,
    companyName: null,
    latitude: null,
    longitude: null,
    profilePicture: null,
  };

  // جلسة المستخدم الحالية
  private currentUser: AuthSession | null = null;
  private STORAGE_KEY = 'chainly-auth';

  constructor(private http: HttpClient) {
    this.loadSessionFromStorage();
  }

  /* ============== session helpers ============== */

  private loadSessionFromStorage() {
    const raw = localStorage.getItem(this.STORAGE_KEY);
    if (!raw) return;

    try {
      this.currentUser = JSON.parse(raw) as AuthSession;
    } catch {
      this.currentUser = null;
    }
  }

  /** حفظ السيشن في الـ service + localStorage */
  setAuthSession(session: AuthSession) {
    this.currentUser = session;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(session));
  }

  /** اسم المستخدم */
  getCurrentUserName(): string | null {
    return this.currentUser?.fullName ?? null;
  }

  /** صورة المستخدم */
  getCurrentUserAvatar(): string | null {
    return this.currentUser?.avatarUrl ?? null;
  }

  /** دور المستخدم */
  getCurrentUserRole(): UserRole | null {
    return this.currentUser?.role ?? null;
  }

  /** ⬅️ دي اللي كان محتاجها الـ dashboard */
  getAccessToken(): string | null {
    return this.currentUser?.token ?? null;
  }

  isLoggedIn(): boolean {
    return !!this.currentUser?.token;
  }

  logout() {
    this.currentUser = null;
    localStorage.removeItem(this.STORAGE_KEY);
  }

  /* ============== register flow data ============== */

  setRegisterRole(role: UserRole) {
    this.registerData.role = role;
  }

  getRegisterRole(): UserRole | null {
    return this.registerData.role;
  }

  setRegisterPersonalData(data: {
    fullName: string;
    email: string;
    companyName: string;
    latitude: number;
    longitude: number;
  }) {
    this.registerData = {
      ...this.registerData,
      fullName: data.fullName,
      email: data.email,
      companyName: data.companyName,
      latitude: data.latitude,
      longitude: data.longitude,
    };
  }

  setRegisterPhoto(file: File) {
    this.registerData.profilePicture = file;
  }

  getRegisterPhoto(): File | null {
    return this.registerData.profilePicture;
  }

  getRegisterEmail(): string | null {
    return this.registerData.email;
  }

  getRegisterData(): RegisterData {
    return this.registerData;
  }

  clearRegisterData() {
    this.registerData = {
      role: null,
      fullName: null,
      email: null,
      companyName: null,
      latitude: null,
      longitude: null,
      profilePicture: null,
    };
  }

  /** تستخدم بعد نجاح الـ OTP – لسه معندناش توكن حقيقي من الـ API */
  setAuthFromRegister() {
    if (!this.registerData.email || !this.registerData.fullName) return;

    const session: AuthSession = {
      fullName: this.registerData.fullName,
      email: this.registerData.email,
      role: this.registerData.role,
      token: 'REGISTER_VERIFIED', // أي سترينج يخلّي isLoggedIn = true
    };

    this.setAuthSession(session);
  }

  /* ============== auth APIs ============== */

  login(payload: { email: string; password: string }): Observable<any> {
    // مفيش تغيير هنا – لسه بترجّع الـ response زي ما هو
    // بعد الـ subscribe من الـ component تأكدي إنك بتعملي setAuthSession(...)
    return this.http.post(`${this.baseUrl}/login`, payload);
  }

  forgetPassword(payload: { email: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}/forget-password`, payload, {
      responseType: 'text' as 'json',
    });
  }

  validateOtp(payload: { email: string; otp: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}/validate-otp`, payload, {
      responseType: 'text' as 'json',
    });
  }

  resendOtp(payload: { email: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}/resend-otp`, payload, {
      responseType: 'text' as 'json',
    });
  }

  resetPassword(payload: {
    password: string;
    confirmPassword: string;
  }): Observable<string> {
    return this.http.post<string>(`${this.baseUrl}/reset-password`, payload, {
      responseType: 'text' as 'json',
    });
  }

  register(payload: {
    fullName: string;
    email: string;
    password: string;
    confirmPassword: string;
    companyName: string;
    latitude: number;
    longitude: number;
    profilePicture?: File | null;
  }) {
    const formData = new FormData();
    formData.append('FullName', payload.fullName);
    formData.append('Email', payload.email);
    formData.append('Password', payload.password);
    formData.append('ConfirmPassword', payload.confirmPassword);
    formData.append('CompanyName', payload.companyName);
    formData.append('LocationLatitude', String(payload.latitude));
    formData.append('LocationLongitude', String(payload.longitude));

    const profileFile =
      payload.profilePicture ?? this.registerData.profilePicture;

    if (profileFile) {
      formData.append('ProfilePicture', profileFile, profileFile.name);
    }

    return this.http.post(`${this.baseUrl}/register`, formData);
  }
}
