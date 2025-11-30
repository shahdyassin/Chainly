import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-dashboard-shell',
  standalone: true,
  templateUrl: './dashboard-shell.html',
  styleUrl: './dashboard-shell.scss',
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
})
export class DashboardShell {
  isSidebarCollapsed = false;

  userName = '';
  userRole = '';
  userAvatarUrl = '/images/dashboard/user-placeholder.png';

  constructor(private auth: AuthService) {
    this.userName = this.auth.getCurrentUserName() || 'User';
    this.userRole = this.auth.getCurrentUserRole() || 'Manager';
    this.userAvatarUrl =
      this.auth.getCurrentUserAvatar() ||
      '/images/dashboard/user-placeholder.png';
  }

  toggleSidebar() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }
}
