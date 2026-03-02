import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ApiRole {
  id: number;
  name: string;
}

export interface ApiUser {
  id: number;
  fullName: string;
  email: string;
  roles: string[];
  isActive: boolean;
}


export interface PagedResponse<T> {
  items: T[];
  totalCount: number;
  totalPages: number;
  activeUsersCount: number;
  inactiveUsersCount: number;
}



@Injectable({
  providedIn: 'root'
})
export class UsersService {

  private baseUrl = 'https://chainly.azurewebsites.net/api/Users';
  private rolesUrl = 'https://chainly.azurewebsites.net/api/Roles';

  constructor(private http: HttpClient) { }

  getUsers(
    pageNumber: number,
    pageSize: number,
    isActive?: boolean,
    roleId?: number,
    search?: string
  ): Observable<PagedResponse<ApiUser>> {

    let params = new HttpParams()
      .set('pageNumber', pageNumber)
      .set('pageSize', pageSize);

    if (isActive !== undefined) {
      params = params.set('isActive', isActive);
    }

    if (roleId) {
      params = params.set('roleId', roleId);
    }

    if (search && search.trim()) {
      params = params.set('search', search.trim());
    }

    return this.http.get<PagedResponse<ApiUser>>(this.baseUrl, { params });
  }

  updateUser(userId: number, body: any) {
    return this.http.put(
      `${this.baseUrl}/${userId}`,
      body,
      { responseType: 'text' }
    );
  }

  updateUserActivation(userId: number, isActive: boolean) {
    return this.http.patch(
      `${this.baseUrl}/${userId}/activation`,
      null,
      {
        params: { isActive }
      }
    );
  }
  deleteUser(userId: number) {
    return this.http.delete(`${this.baseUrl}/${userId}`, {
      responseType: 'text'
    });
  }

  getRoles() {
    return this.http.get<any>(this.rolesUrl);
  }
}

