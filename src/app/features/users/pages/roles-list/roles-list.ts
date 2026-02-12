import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface PermissionGroup {
  name: string;
  open: boolean;
  permissions: string[];
  rowIndex: number;
}


@Component({
  selector: 'app-roles-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './roles-list.html',
  styleUrl: './roles-list.scss',
})
export class RolesList {

  roles: string[] = [
  'Admin',
  'Tactics',
  'Manager',
  'Operator',
  'Viewer',
  'Supervisor',
];

hoveredRow: number | null = null;


permissionGroups: PermissionGroup[] = [
  { name: 'User', open: true, permissions: ['View User', 'Update User', 'Create User', 'Delete User'], rowIndex: 0 },
  { name: 'Role', open: false, permissions: ['View Role', 'Create Role'], rowIndex: 4 },
  { name: 'Supplier', open: false, permissions: ['View Supplier', 'Create Supplier'], rowIndex: 6 },
  { name: 'Company', open: false, permissions: ['View Company'], rowIndex: 8 },
  { name: 'Materials', open: false, permissions: ['View Materials'], rowIndex: 9 },
  { name: 'Production Line', open: false, permissions: ['View Production Line'], rowIndex: 10 },
  { name: 'Product', open: false, permissions: ['View Product'], rowIndex: 11 },
  { name: 'Report', open: false, permissions: ['View Report'], rowIndex: 12 },
];


  matrix = Array.from({ length: 20 });

  toggleGroup(group: PermissionGroup) {
    group.open = !group.open;
  }
}
