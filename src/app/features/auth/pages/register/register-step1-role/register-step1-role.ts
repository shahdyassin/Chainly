import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService, UserRole } from '../../../../../core/services/auth.service';

@Component({
  selector: 'app-register-step1',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './register-step1-role.html',
  styleUrl: './register-step1-role.scss',
})
export class RegisterStep1Role {
  selectedRole: UserRole | null = null;

  constructor(
    private router: Router,
    private auth: AuthService
  ) {
    const savedRole = this.auth.getRegisterRole();
    if (savedRole) {
      this.selectedRole = savedRole;
    }
  }

  selectRole(role: UserRole) {
    this.selectedRole = role;
  }

  isSelected(role: UserRole): boolean {
    return this.selectedRole === role;
  }

  next() {
    if (!this.selectedRole) return;

    this.auth.setRegisterRole(this.selectedRole);
    this.router.navigate(['/auth/register-step2-personal'], {
      queryParams: { role: this.selectedRole },
    });
  }

  goToLogin() {
    this.router.navigate(['/auth/login']);
  }
}
