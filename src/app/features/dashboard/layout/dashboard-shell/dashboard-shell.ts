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


  private currentParams: Record<string, any> = {};

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
    this.currentParams = {};

    while (current?.firstChild) {
      current = current.firstChild;


      this.currentParams = {
        ...this.currentParams,
        ...(current.snapshot.params || {}),
      };
    }

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
    const id = this.currentParams['id'];


    if (!parts.length) return [{ label: 'Dashboard', link: ['/dashboard'] }];

    const crumbs: Crumb[] = [];

    for (let i = 0; i < parts.length; i++) {
      const label = parts[i].toLowerCase();


if (label === 'suppliers') {
  crumbs.push({ label: parts[i], link: ['/dashboard/suppliers'] });
  continue;
}

if (label === 'import files') {
  crumbs.push({ label: parts[i], link: ['/dashboard/suppliers/import-files'] });
  continue;
}

if (label === 'supplier add') {
  crumbs.push({ label: parts[i], link: ['/dashboard/suppliers/supplier-add'] });
  continue;
}

if (label === 'supplier edit') {
  crumbs.push({ label: parts[i], link: id ? ['/dashboard/suppliers/supplier-edit', id] : undefined });
  continue;
}

if (label === 'supplier info') {
  crumbs.push({ label: parts[i], link: id ? ['/dashboard/suppliers/supplier-info', id] : undefined });
  continue;
}
if (label === 'supplies') {
  crumbs.push({ label: parts[i], link: ['/dashboard/supplies-list'] });
  continue;
}

if (label === 'supply info') {
  crumbs.push({
    label: parts[i],
    link: id ? ['/dashboard/supplies-list/supplies-info', id] : undefined,
  });
  continue;
}
if (label === 'orders') {
  crumbs.push({ label: parts[i], link: ['/dashboard/orders'] });
  continue;
}

if (label === 'order details') {
  crumbs.push({
    label: parts[i],
    link: id ? ['/dashboard/orders', id] : undefined,
  });
  continue;
}

if (label === 'edit order') {
  crumbs.push({
    label: parts[i],
    link: id ? ['/dashboard/orders', id, 'edit'] : undefined,
  });
  continue;
}



      crumbs.push({ label: parts[i] });
    }

    return crumbs;
  }

  toggleSidebar() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }
}
