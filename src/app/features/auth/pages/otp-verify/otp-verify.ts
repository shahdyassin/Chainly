import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators,  ReactiveFormsModule, } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-otp-verify',
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  templateUrl: './otp-verify.html',
  styleUrl: './otp-verify.scss',
})
export class OtpVerify {
  form: FormGroup;
  code = [0, 1, 2, 3, 4, 5];
  loading = false;
  errorMessage = '';

  userEmail = localStorage.getItem("fp-email") ?? "";

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) {
    this.form = this.fb.group({
      d0: ['', Validators.required],
      d1: ['', Validators.required],
      d2: ['', Validators.required],
      d3: ['', Validators.required],
      d4: ['', Validators.required],
      d5: ['', Validators.required],
    });
  }

  moveNext(event: any, index: number) {
    if (event.target.value && index < 5) {
      const next = document.querySelectorAll('.otp-box')[index + 1] as HTMLElement;
      next?.focus();
    }
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const otp = Object.values(this.form.value).join("");

    this.loading = true;
    this.errorMessage = "";

    this.auth.validateOtp({
      email: this.userEmail,
      otp: otp
    }).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/auth/reset-password']);
      },
      error: () => {
        this.loading = false;
        this.errorMessage = "Invalid OTP. Please try again.";
      }
    });
  }

  resendCode() {
    this.auth.resendOtp({ email: this.userEmail }).subscribe();
  }

  goBack() {
    this.router.navigate(['/auth/forget-password']);
  }
}
