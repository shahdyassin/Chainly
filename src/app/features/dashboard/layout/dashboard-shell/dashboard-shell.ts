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


  sectionState = {
    main: true,
    operations: true,
    suppliers: true,
    management: true
  };

  toggleSection(section: keyof typeof this.sectionState) {
    this.sectionState[section] = !this.sectionState[section];
  }

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
    const roleName = history.state?.roleName;
    const productionLineName = history.state?.productionLineName;


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
      if (label === 'users management') {
        crumbs.push({ label: parts[i], link: ['/dashboard/users-list'] });
        continue;
      }
      if (label === 'roles') {
        crumbs.push({ label: parts[i], link: ['/dashboard/roles-list'] });
        continue;
      }
      if (label === 'production lines') {
        crumbs.push({ label: parts[i], link: ['/dashboard/production-lines'] });
        continue;
      }
      if (label === 'digital twin') {
        crumbs.push({ label: parts[i], link: ['/dashboard/digital-twin'] });
        continue;
      }


      crumbs.push({ label: parts[i] });
    }
    if (productionLineName) {
      crumbs.push({ label: productionLineName });
    }
    if (roleName) {
      crumbs.push({ label: roleName });
    }

    return crumbs;
  }

  toggleSidebar() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  formatNumbers(text: string): string {
    return text.replace(/\d+/g, (num) => `<span class="num">${num}</span>`);
  }
  splitLabel(text: string) {
    if (!text) return { word: '', underscore: '', number: '' };

    if (text.includes('_')) {
      const [word, number] = text.split('_');

      return {
        word,
        underscore: '_',
        number
      };
    }

    const match = text.match(/(.*?)(\d+)$/);

    if (!match) return { word: text, underscore: '', number: '' };

    return {
      word: match[1],
      underscore: '',
      number: match[2]
    };
  }
}
