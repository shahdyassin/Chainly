import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../../core/services/auth.service';

@Component({
  selector: 'app-register-step3',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './register-step4-password.html',
  styleUrl: './register-step4-password.scss',
})
export class RegisterStep4Password {
  passwordForm: FormGroup;
  showPassword = false;
  showConfirmPassword = false;
  loading = false;
  backendError = '';

  fullName = '';
  email = '';
  companyName = '';
  latitude = 0;
  longitude = 0;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) {
    this.passwordForm = this.fb.group(
      {
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required]],
      },
      { validators: this.passwordsMatchValidator }
    );

    const data = this.auth.getRegisterData();

    if (!data.email) {
      this.router.navigate(['/auth/register-step2-personal']);
    } else {
      this.fullName = data.fullName ?? '';
      this.email = data.email ?? '';
      this.companyName = data.companyName ?? '';
      this.latitude = data.latitude ?? 0;
      this.longitude = data.longitude ?? 0;
    }
  }

  private passwordsMatchValidator(group: FormGroup) {
    const p = group.get('password')?.value;
    const c = group.get('confirmPassword')?.value;
    return p && c && p === c ? null : { mismatch: true };
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPassword() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  back() {
    this.router.navigate(['/auth/register-step3-photo']);
  }

  next() {
    if (this.passwordForm.invalid || this.loading) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.backendError = '';

    const { password, confirmPassword } = this.passwordForm.value;

    this.auth
      .register({
        fullName: this.fullName,
        email: this.email,
        companyName: this.companyName,
        password,
        confirmPassword,
        latitude: this.latitude,
        longitude: this.longitude,
        
        profilePicture: this.auth.getRegisterPhoto(),
      })
      .subscribe({
        next: () => {
          this.loading = false;
          this.router.navigate(['/auth/register-step5-email-confirm']);
        },
        error: (err) => {
          this.loading = false;

          const e = err?.error;
          if (typeof e === 'string') {
            this.backendError = e;
          } else if (e?.errors) {
            const allErrors = Object.values(e.errors).flat() as string[];
            this.backendError = allErrors[0] || 'Something went wrong';
          } else if (e?.title) {
            this.backendError = e.title;
          } else {
            this.backendError = 'Something went wrong, please try again.';
          }
        },
      });
  }
}
