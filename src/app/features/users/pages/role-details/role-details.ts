import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { RolesService, RoleDetailsResponse, ApiRole } from '../../../../core/services/roles.service';

@Component({
  selector: 'app-role-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './role-details.html',
  styleUrl: './role-details.scss'
})
export class RoleDetails implements OnInit {

  roleId!: number;
  roleName = '';
  permissions: { module: string; items: any[]; isOpen: boolean; }[] = [];

  rolesList: { id: number; name: string }[] = [];
  currentIndex = -1;
  isRolesLoaded = false;
  isLoading = false;


  showDeleteModal = false;
  isDeleting = false;
  selectedRole: ApiRole | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private rolesService: RolesService
  ) { }

  ngOnInit(): void {
    // this.roleId = Number(this.route.snapshot.paramMap.get('id'));

    if (!this.isRolesLoaded) {
      this.rolesService.getRoles(1, 1000).subscribe(res => {
        this.rolesList = res.items;
        this.isRolesLoaded = true;
        this.listenToRoute();
      });
    } else {
      this.listenToRoute();
    }

    const nav = this.router.getCurrentNavigation();
    const roleNameFromState = nav?.extras?.state?.['roleName'];

    if (roleNameFromState) {
      this.route.snapshot.data['title'] =
        `Users Management / Roles / ${roleNameFromState}`;
    }

    // this.loadRole();
    // this.loadRolesList();
  }


  listenToRoute() {

    this.route.paramMap.subscribe(params => {

      this.roleId = Number(params.get('id'));

      this.currentIndex =
        this.rolesList.findIndex(r => r.id === this.roleId);


      this.roleName = this.rolesList[this.currentIndex]?.name || '';

      this.loadRole();

    });

  }

  loadRolesList() {

    this.rolesService.getRoles(1, 1000).subscribe(res => {

      this.rolesList = res.items;

      this.currentIndex =
        this.rolesList.findIndex(r => r.id === this.roleId);

      this.loadRole();

    });

  }

  loadRole() {

    this.isLoading = true;

    this.rolesService.getRoleById(this.roleId)
      .subscribe(res => {

        this.permissions = Object.keys(res.permissions).map(key => ({
          module: key,
          items: res.permissions[key],
          isOpen: true
        }));

        this.isLoading = false;

      });

  }

  toggleSection(section: any) {
    section.isOpen = !section.isOpen;
  }


  get hasPrevious() {
    return this.currentIndex > 0;
  }

  get hasNext() {
    return this.currentIndex < this.rolesList.length - 1;
  }

  goPrevious() {
    if (!this.hasPrevious) return;

    const prevRole = this.rolesList[this.currentIndex - 1];

    this.router.navigate(
      ['/dashboard/roles-list', prevRole.id],
      { state: { roleName: prevRole.name } }
    );
  }

  goNext() {
    if (!this.hasNext) return;

    const nextRole = this.rolesList[this.currentIndex + 1];

    this.router.navigate(
      ['/dashboard/roles-list', nextRole.id],
      { state: { roleName: nextRole.name } }
    );
  }


  openDelete() {
    this.selectedRole = {
      id: this.roleId,
      name: this.roleName
    } as ApiRole;

    this.showDeleteModal = true;
  }

  closeDeleteModal() {
    if (this.isDeleting) return;
    this.showDeleteModal = false;
    this.selectedRole = null;
  }

  confirmDelete() {
    if (!this.selectedRole) return;

    const deletedRoleId = this.selectedRole.id;


    this.showDeleteModal = false;
    this.selectedRole = null;


    let nextRoleId: number | null = null;

    if (this.hasNext) {
      nextRoleId = this.rolesList[this.currentIndex + 1].id;
    } else if (this.hasPrevious) {
      nextRoleId = this.rolesList[this.currentIndex - 1].id;
    }


    this.rolesList = this.rolesList.filter(r => r.id !== deletedRoleId);

    if (nextRoleId) {
      this.router.navigate(['/dashboard/roles-list', nextRoleId]);
    } else {
      this.router.navigate(['/dashboard/roles-list']);
    }


    this.rolesService.deleteRole(deletedRoleId).subscribe({
      error: () => {
        console.error('Delete failed');
      }
    });
  }

  goToEdit() {
    this.router.navigate(
      ['/dashboard/roles-list', this.roleId, 'edit'],
      { state: { roleName: this.roleName } }
    );
  }

}
