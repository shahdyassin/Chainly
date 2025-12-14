import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-dashboard-shell',
  standalone: true,
  templateUrl: './dashboard-shell.html',
  styleUrl: './dashboard-shell.scss',
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
})
export class DashboardShell implements OnInit {
  isSidebarCollapsed = false;

  userName = '';
  userRole = '';
  userAvatarUrl = '/icons/dashboard/user.svg';

  pageTitle = 'Dashboard'; 

  constructor(
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.userName = this.auth.getCurrentUserName() || 'User';
    this.userRole = this.auth.getCurrentUserRole() || 'Manager';
    this.userAvatarUrl =
      this.auth.getCurrentUserAvatar() || '/icons/dashboard/user.svg';
  }

  ngOnInit(): void {

    this.setTitleFromRoute();

    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => this.setTitleFromRoute());
  }

  private setTitleFromRoute() {

    let current: ActivatedRoute | null = this.route;
    while (current?.firstChild) current = current.firstChild;

    this.pageTitle = current?.snapshot.data?.['title'] || 'Dashboard';
  }

  toggleSidebar() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }
}
