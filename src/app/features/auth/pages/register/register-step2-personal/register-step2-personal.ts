import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormsModule,
} from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../../core/services/auth.service';
import { MapPickerComponent } from '../../../../../shared/map-picker/map-picker';

@Component({
  selector: 'app-register-step2',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MapPickerComponent],
  templateUrl: './register-step2-personal.html',
  styleUrl: './register-step2-personal.scss',
})
export class RegisterStep2Personal {
  personalForm!: FormGroup;
  selectedLocation: string | null = null;

  showMap = false;
  tempLocation: { lat: number; lng: number } | null = null;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    const data = this.auth.getRegisterData();

    this.personalForm = this.fb.group({
      email: [data.email ?? '', [Validators.required, Validators.email]],
      fullName: [data.fullName ?? '', Validators.required],
      companyName: [data.companyName ?? '', Validators.required],
      companyLocation: ['', Validators.required],
    });

    if (data.latitude != null && data.longitude != null) {
      this.selectedLocation = `${data.latitude.toFixed(
        5
      )}, ${data.longitude.toFixed(5)}`;

      this.personalForm.patchValue({
        companyLocation: this.selectedLocation,
      });

      this.tempLocation = { lat: data.latitude, lng: data.longitude };
    }
  }

  goToLogin() {
    this.router.navigate(['/auth/login']);
  }

  back() {
    this.router.navigate(['/auth/register-step1-role']);
  }

  next() {
    if (this.personalForm.invalid) return;

    const { email, fullName, companyName } = this.personalForm.value;
    const current = this.auth.getRegisterData();

    const latitude = this.tempLocation?.lat ?? current.latitude ?? 0;
    const longitude = this.tempLocation?.lng ?? current.longitude ?? 0;

    this.auth.setRegisterPersonalData({
      fullName,
      email,
      companyName,
      latitude,
      longitude,
    });

    this.router.navigate(['/auth/register-step3-photo']);
  }

  onSubmit() {
    this.next();
  }


  openLocationPicker() {
    this.showMap = true;
  }


  cancelLocation() {
    this.showMap = false;
  }


  onLocationSelected(location: { lat: number; lng: number }) {
    this.tempLocation = location;
    this.selectedLocation = `${location.lat.toFixed(
      5
    )}, ${location.lng.toFixed(5)}`;
  }

 
  confirmLocation() {
    if (!this.tempLocation) return;

    const { lat, lng } = this.tempLocation;

    this.selectedLocation = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    this.personalForm.get('companyLocation')?.setValue(this.selectedLocation);

    const { email, fullName, companyName } = this.personalForm.value;

    this.auth.setRegisterPersonalData({
      fullName,
      email,
      companyName,
      latitude: lat,
      longitude: lng,
    });

    this.showMap = false;
  }
}
