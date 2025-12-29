import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../../core/services/auth.service';

@Component({
  selector: 'app-register-step5',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './register-step5-email-confirm.html',
  styleUrl: './register-step5-email-confirm.scss',
})
export class RegisterStep5EmailConfirm implements OnInit {
  form: FormGroup;
  code = [0, 1, 2, 3, 4, 5];
  loading = false;
  errorMessage = '';

  userEmail = '';

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

    this.userEmail = this.auth.getRegisterEmail() ?? '';

    if (!this.userEmail) {
      this.router.navigate(['/auth/register-step2-personal']);
    }
  }

  ngOnInit(): void {
    if (this.userEmail) {
      this.auth.resendOtp({ email: this.userEmail }).subscribe({
        error: () => {},
      });
    }
  }

  get maskedEmail(): string {
    if (!this.userEmail) return '';
    const [name, domain] = this.userEmail.split('@');
    if (!domain) return this.userEmail;

    const visible = name.slice(0, 2);
    const stars = '*'.repeat(Math.max(name.length - 2, 3));
    return `${visible}${stars}@${domain}`;
  }

  moveNext(event: any, index: number) {
    if (event.target.value && index < 5) {
      const next = document.querySelectorAll(
        '.otp-box'
      )[index + 1] as HTMLElement;
      next?.focus();
    }
  }

  onSubmit() {
    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      return;
    }

    const otp = Object.values(this.form.value).join('');

    this.loading = true;
    this.errorMessage = '';

    this.auth
      .validateOtp({
        email: this.userEmail,
        otp: otp,
      })
      .subscribe({
        next: () => {
          this.loading = false;

          
          this.auth.setAuthFromRegister();
          this.auth.clearRegisterData();

          this.router.navigate(['/dashboard']);
        },
        error: () => {
          this.loading = false;
          this.errorMessage = 'Invalid OTP. Please try again.';
        },
      });
  }

  resendCode() {
    if (!this.userEmail) return;
    this.auth.resendOtp({ email: this.userEmail }).subscribe();
  }

  goBack() {
    this.router.navigate(['/auth/register-step4-password']);
  }
}
