import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';



@Component({
  selector: 'app-forget-password',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    
  ],
  templateUrl: './forget-password.html',
  styleUrl: './forget-password.scss',
})
export class ForgetPassword {
  form: FormGroup;
  loading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  get email() {
    return this.form.get('email')!;
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService.forgetPassword({ email: this.email.value }).subscribe({
      next: (res) => {
        console.log('forget-password success =>', res);
        this.loading = false;


        localStorage.setItem('fp-email', this.email.value);


        this.router.navigate(['/auth/otp-verify']);
      },
      error: (err) => {
        console.log('forget-password error =>', err);
        this.loading = false;
        this.errorMessage =
          err.error?.message || 'Failed to send reset code. Please try again.';
      },
    });
  }

  goBack() {
    this.router.navigate(['/auth/login']);
  }
}
