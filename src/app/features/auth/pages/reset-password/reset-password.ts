import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.scss',
})
export class ResetPassword {
  form: FormGroup;
  loading = false;
  errorMessage = '';
  successMessage = '';

  showPassword = false;
  showConfirmPassword = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.form = this.fb.group(
      {
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required]],
      },
      { validators: this.passwordsMatchValidator }
    );
  }

  get password() {
    return this.form.get('password')!;
  }

  get confirmPassword() {
    return this.form.get('confirmPassword')!;
  }

  passwordsMatchValidator(group: AbstractControl): ValidationErrors | null {
    const pass = group.get('password')?.value;
    const confirm = group.get('confirmPassword')?.value;
    if (!pass || !confirm) return null;
    return pass === confirm ? null : { mismatch: true };
  }

  togglePasswordVisibility(field: 'password' | 'confirm') {
    if (field === 'password') {
      this.showPassword = !this.showPassword;
    } else {
      this.showConfirmPassword = !this.showConfirmPassword;
    }
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const payload = {
      password: this.password.value,
      confirmPassword: this.confirmPassword.value,
    };

    this.authService.resetPassword(payload).subscribe({
      next: (res) => {
        this.loading = false;
        this.successMessage = res || 'Password reset successfully.';
        setTimeout(() => {
          this.router.navigate(['/auth/login']);
        }, 1500);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage =
          err.error?.message || 'Failed to reset password. Please try again.';
      },
    });
  }

  goBack() {
    this.router.navigate(['/auth/login']);
  }
}
