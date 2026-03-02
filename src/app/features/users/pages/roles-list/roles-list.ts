import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RolesService, ApiRole } from '../../../../core/services/roles.service';

@Component({
  selector: 'app-roles-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './roles-list.html',
  styleUrl: './roles-list.scss',
})
export class RolesList implements OnInit {

  searchText: string = '';
  items: ApiRole[] = [];

  pageNumber: number = 1;
  pageSize: number = 10;
  totalCount: number = 0;
  totalPages: number = 0;
  pagesArray: number[] = [];


  showAddModal = false;
  newRoleName = '';
  isSubmitting = false;

  showSuccessModal = false;
  createdRoleName = '';


  showDeleteModal = false;
  selectedRole: ApiRole | null = null;
  isDeleting = false;

  constructor(private rolesService: RolesService,
    private router: Router
  ) { }


  ngOnInit(): void {
    this.loadRoles();
  }

  loadRoles() {
    this.rolesService
      .getRoles(this.pageNumber, this.pageSize, this.searchText)
      .subscribe({
        next: (res) => {
          this.items = res.items;
          this.totalCount = res.totalCount;
          this.totalPages = res.totalPages;
          this.pagesArray = Array.from(
            { length: this.totalPages },
            (_, i) => i + 1
          );
        }
      });
  }

  onSearchChange() {
    this.pageNumber = 1;
    this.loadRoles();
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.pageNumber = page;
    this.loadRoles();
  }



  openAdd() {
    this.showAddModal = true;
  }

  closeAdd() {
    if (this.isSubmitting) return;
    this.showAddModal = false;
    this.newRoleName = '';
  }

  confirmAdd() {
    if (!this.newRoleName.trim()) return;

    const roleName = this.newRoleName.trim();

    this.isSubmitting = true;

    this.rolesService.createRole(roleName)
      .subscribe({
        next: (createdRole) => {

          this.isSubmitting = false;
          this.showAddModal = false;

          this.createdRoleName = roleName;


          this.selectedRole = createdRole;

          this.showSuccessModal = true;
          this.newRoleName = '';
          this.loadRoles();
        },
        error: () => {
          this.isSubmitting = false;
        }
      });
  }

  openEdit(role: ApiRole) { }
  openDelete(role: ApiRole) {
    this.selectedRole = role;
    this.showDeleteModal = true;
  }

  closeDeleteModal() {
    if (this.isDeleting) return;
    this.showDeleteModal = false;
    this.selectedRole = null;
  }

  confirmDelete() {
    if (!this.selectedRole) return;

    this.isDeleting = true;

    this.rolesService.deleteRole(this.selectedRole.id)
      .subscribe({
        next: () => {
          this.isDeleting = false;
          this.showDeleteModal = false;
          this.selectedRole = null;

          this.loadRoles();
        },
        error: () => {
          this.isDeleting = false;
        }
      });
  }

  closeSuccess() {
    this.showSuccessModal = false;
  }

  goToPermissions() {
    if (!this.selectedRole) return;

    this.showSuccessModal = false;

    this.router.navigate(
      ['/dashboard/roles-list', this.selectedRole.id, 'edit']
    );
  }

  viewRole(role: ApiRole) {
    this.router.navigate(
      ['/dashboard/roles-list', role.id],
      {
        state: { roleName: role.name }
      }
    );
  }
  editRole(role: ApiRole) {
    this.router.navigate(
      ['/dashboard/roles-list', role.id, 'edit'],
      {
        state: { roleName: role.name }
      }
    );
  }
}
