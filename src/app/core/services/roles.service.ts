import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ApiRole {
  id: number;
  name: string;
}

export interface PagedRolesResponse {
  items: ApiRole[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

export interface RolePermission {
  name: string;
  isAssigned: boolean;
}

export interface RoleDetailsResponse {
  name: string;
  permissions: {
    [module: string]: RolePermission[];
  };
}

@Injectable({
  providedIn: 'root'
})
export class RolesService {

  private rolesUrl = 'https://chainly.azurewebsites.net/api/Roles';

  constructor(private http: HttpClient) { }

  getRoles(
    pageNumber: number,
    pageSize: number,
    search?: string
  ): Observable<PagedRolesResponse> {

    let params = new HttpParams()
      .set('pageNumber', pageNumber)
      .set('pageSize', pageSize);

    if (search && search.trim()) {
      params = params.set('search', search.trim());
    }

    return this.http.get<PagedRolesResponse>(this.rolesUrl, { params });
  }

  getRoleById(roleId: number): Observable<RoleDetailsResponse> {
    return this.http.get<RoleDetailsResponse>(`${this.rolesUrl}/${roleId}`);
  }

  createRole(name: string): Observable<ApiRole> {
    return this.http.post<ApiRole>(this.rolesUrl, { name });
  }

  updateRole(roleId: number, body: any) {
    return this.http.put(
      `${this.rolesUrl}/${roleId}`,
      body
    );
  }

  deleteRole(roleId: number) {
    return this.http.delete(`${this.rolesUrl}/${roleId}`, {
      responseType: 'text'
    });
  }
}
