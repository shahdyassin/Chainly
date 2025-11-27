import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';


@Component({
  selector: 'app-login',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
form: FormGroup;
  loading = false;
  errorMessage = '';
  showPassword = false;

  constructor(private fb: FormBuilder, private authService: AuthService) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
      rememberMe: [false],
    });
  }

  get email() {
    return this.form.get('email')!;
  }

  get password() {
    return this.form.get('password')!;
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.authService.login(this.form.value).subscribe({
      next: (res) => {
        this.loading = false;
        console.log('LOGIN SUCCESS', res);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Login failed, please try again.';
      },
    });
  }
}
