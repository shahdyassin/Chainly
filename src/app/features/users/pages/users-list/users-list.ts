import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UsersService } from '../../../../core/services/users.service';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  status: 'Active' | 'Inactive';
  active: boolean;
}

@Component({
  selector: 'app-users-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './users-list.html',
  styleUrl: './users-list.scss',
})
export class UsersList implements OnInit {

  users: User[] = [];

  searchText = '';
  statusFilter: 'all' | 'active' | 'inactive' = 'all';

  pageNumber = 1;
  pageSize = 8;
  totalPages = 0;
  totalCount = 0;

  activeCount = 0;
  inactiveCount = 0;


  roles: { id: number; name: string }[] = [];
  selectedRoleId?: number;
  showRoleDropdown = false;


  showDeleteModal = false;
  selectedUser: User | null = null;

  showInviteModal = false;
  inviteEmail = '';

  constructor(
    private router: Router,
    private usersService: UsersService
  ) { }

  ngOnInit() {
    this.loadRoles();
    this.loadUsers();
  }

  goToRoles() {
    this.router.navigate(['/dashboard/roles-list']);
  }

  loadRoles() {
    this.usersService.getRoles().subscribe(res => {
      this.roles = res.items;
    });
  }

  loadUsers() {
    const isActive =
      this.statusFilter === 'active'
        ? true
        : this.statusFilter === 'inactive'
          ? false
          : undefined;

    this.usersService
      .getUsers(
        this.pageNumber,
        this.pageSize,
        isActive,
        this.selectedRoleId,
        this.searchText
      )
      .subscribe({
        next: (res) => {
          this.totalCount = res.totalCount;
          this.totalPages = res.totalPages;

          this.activeCount = res.activeUsersCount;
          this.inactiveCount = res.inactiveUsersCount;
          this.users = res.items.map(u => ({
            id: u.id,
            name: u.fullName,
            email: u.email,
            role: u.roles && u.roles.length ? u.roles.join(', ') : '-',
            status: u.isActive ? 'Active' : 'Inactive',
            active: u.isActive
          }));
        }
        ,
        error: (err) => {
          console.error('Error loading users', err);
        }
      });
  }



  onSearchChange() {
    this.pageNumber = 1;
    this.loadUsers();
  }


  setStatusFilter(type: 'all' | 'active' | 'inactive') {
    this.statusFilter = type;
    this.pageNumber = 1;
    this.loadUsers();
  }


  toggleRoleDropdown() {
    this.showRoleDropdown = !this.showRoleDropdown;
  }



  clearRoles(e: Event) {
    e.stopPropagation();
    this.selectedRoleId = undefined;
    this.loadUsers();
  }

  getRoleCount(role: string) {
    return this.users.filter(u => u.role.includes(role)).length;
  }


  goToPage(p: number) {
    if (p >= 1 && p <= this.totalPages) {
      this.pageNumber = p;
      this.loadUsers();
    }
  }

  nextPage() {
    if (this.pageNumber < this.totalPages) {
      this.pageNumber++;
      this.loadUsers();
    }
  }

  prevPage() {
    if (this.pageNumber > 1) {
      this.pageNumber--;
      this.loadUsers();
    }
  }

  get pagesArray(): number[] {
    return Array(this.totalPages).fill(0).map((_, i) => i + 1);
  }

  get startIndex(): number {
    return (this.pageNumber - 1) * this.pageSize;
  }

  get endIndex(): number {
    return Math.min(this.startIndex + this.pageSize, this.totalCount);
  }

  isNumber(value: number | string): value is number {
    return typeof value === 'number';
  }


  openDeleteModal(user: User) {
    this.selectedUser = user;
    this.showDeleteModal = true;
  }

  closeDeleteModal() {
    this.showDeleteModal = false;
    this.selectedUser = null;
  }

  confirmDeleteUser() {
    if (!this.selectedUser) return;

    this.usersService.deleteUser(this.selectedUser.id).subscribe({
      next: () => {
        this.closeDeleteModal();
        this.loadUsers();
      },
      error: (err) => {
        console.error('Failed to delete user', err);
      }
    });
  }



  openInviteModal() {
    this.showInviteModal = true;
  }

  closeInviteModal() {
    this.showInviteModal = false;
    this.inviteEmail = '';
  }

  sendInvitation() {
    console.log('Invitation sent to:', this.inviteEmail);
    this.closeInviteModal();
  }


  onToggleStatus(user: User, isActive: boolean) {
    this.usersService.updateUserActivation(user.id, isActive).subscribe({
      next: () => {
        user.active = isActive;
        user.status = isActive ? 'Active' : 'Inactive';


        this.loadUsers();
      },
      error: () => {
        console.error('Failed to update activation');
        user.active = !isActive;
        user.status = !isActive ? 'Active' : 'Inactive';
      }
    });
  }

  selectRole(role: any, e: Event) {
    e.stopPropagation();

    this.selectedRoleId = role.id;
    this.pageNumber = 1;
    this.loadUsers();
    this.showRoleDropdown = false;
  }
  get selectedRoleName(): string {
    const role = this.roles.find(r => r.id === this.selectedRoleId);
    return role ? role.name : 'Role';
  }

}
