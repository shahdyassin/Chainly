import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterOutlet,
  RouterLink,
  RouterLinkActive,
} from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../../../core/services/auth.service';

type Crumb = { label: string; link?: any[] };

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

  breadcrumbTitle = 'Dashboard';

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

    const title = current?.snapshot.data?.['title'];
    this.breadcrumbTitle = title ? String(title) : 'Dashboard';
  }

  private toParts(title: string): string[] {
    return (title || '')
      .replace(/[⁄∕]/g, '/')
      .split('/')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  get breadcrumbs(): Crumb[] {
    const parts = this.toParts(this.breadcrumbTitle);

    if (!parts.length) return [{ label: 'Dashboard', link: ['/dashboard'] }];

    const first = parts[0];
    const firstLink =
      first.toLowerCase() === 'suppliers' ? ['/dashboard/suppliers'] :
      first.toLowerCase() === 'supplies'  ? ['/dashboard/supplies-list'] :
      first.toLowerCase() === 'dashboard' ? ['/dashboard'] :
      undefined;

    const crumbs: Crumb[] = [];
    crumbs.push({ label: first, link: firstLink });

    for (let i = 1; i < parts.length; i++) crumbs.push({ label: parts[i] });

    return crumbs;
  }

  toggleSidebar() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }
}
