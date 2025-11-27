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

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private baseUrl = 'https://chainly.azurewebsites.net/api/Authentication';

  private registerData: RegisterData = {
    role: null,
    fullName: null,
    email: null,
    companyName: null,
    latitude: null,
    longitude: null,
    profilePicture: null,
  };

  constructor(private http: HttpClient) {}



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



  login(payload: { email: string; password: string }): Observable<any> {
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
