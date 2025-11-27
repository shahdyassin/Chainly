import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class RegisterStateService {

  role: string | null = null;


  fullName: string | null = null;
  email: string | null = null;
  companyName: string | null = null;
  locationLatitude: number | null = null;
  locationLongitude: number | null = null;


  photoFile: File | null = null;


  emailConfirmed = false;


  clear() {
    this.role = null;
    this.fullName = null;
    this.email = null;
    this.companyName = null;
    this.locationLatitude = null;
    this.locationLongitude = null;
    this.photoFile = null;
    this.emailConfirmed = false;
  }
}
