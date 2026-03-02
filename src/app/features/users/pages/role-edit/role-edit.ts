import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { RolesService } from '../../../../core/services/roles.service';

interface PermissionItem {
  name: string;
  isAssigned: boolean;
}

interface PermissionSection {
  module: string;
  items: PermissionItem[];
  isOpen: boolean;
}

@Component({
  selector: 'app-role-edit',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './role-edit.html',
  styleUrl: './role-edit.scss'
})
export class RoleEdit implements OnInit {

  roleId!: number;
  roleName = '';
  permissions: PermissionSection[] = [];
  isSaving = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private rolesService: RolesService
  ) { }

  ngOnInit(): void {
    this.roleId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadRole();
  }

  loadRole() {
    this.rolesService.getRoleById(this.roleId)
      .subscribe(res => {

        this.roleName = res.name;

        this.permissions = Object.keys(res.permissions).map(key => ({
          module: key,
          items: res.permissions[key],
          isOpen: true
        }));
      });
  }

  togglePermission(item: PermissionItem) {
    item.isAssigned = !item.isAssigned;
  }
  toggleSection(section: PermissionSection) {
    section.isOpen = !section.isOpen;
  }

  toggleSelectAllSection(section: PermissionSection) {

    const allSelected = this.isSectionAllSelected(section);

    section.items.forEach(p => p.isAssigned = !allSelected);

  }

  toggleSelectAll() {
    const allSelected =
      this.permissions.every(s =>
        s.items.every(p => p.isAssigned)
      );

    this.permissions.forEach(s =>
      s.items.forEach(p => p.isAssigned = !allSelected)
    );
  }

  confirm() {

    this.isSaving = true;

    const payload = {
      name: this.roleName,
      permissions: {}
    } as any;

    this.permissions.forEach(section => {
      payload.permissions[section.module] = section.items;
    });

    this.rolesService.updateRole(this.roleId, payload)
      .subscribe({
        next: () => {
          this.isSaving = false;
          this.router.navigate(['/dashboard/roles-list', this.roleId]);
        },
        error: () => {
          this.isSaving = false;
        }
      });
  }

  discard() {
    this.router.navigate(['/dashboard/roles-list', this.roleId]);
  }

  isAllSelected(): boolean {
    return this.permissions.every(section =>
      section.items.every(p => p.isAssigned)
    );
  }

  isSectionAllSelected(section: any): boolean {
    return section.items.every((p: any) => p.isAssigned);
  }
}
