import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../../../core/services/auth.service';

@Component({
  selector: 'app-register-step3-photo',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './register-step3-photo.html',
  styleUrl: './register-step3-photo.scss',
})
export class RegisterStep3Photo {
  selectedFile: File | null = null;
  previewUrl: string | null = null;
  isDragOver = false;

  constructor(private router: Router, private auth: AuthService) {}

  goToLogin() {
    this.router.navigate(['/auth/login']);
  }

  back() {
    this.router.navigate(['/auth/register-step2-personal']);
  }

  skip() {
    this.router.navigate(['/auth/register-step4-password']);
  }

  next() {
    
    this.router.navigate(['/auth/register-step4-password']);
  }

  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    this.setFile(input.files[0]);
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = false;

    if (!event.dataTransfer || event.dataTransfer.files.length === 0) return;
    this.setFile(event.dataTransfer.files[0]);
  }

  private setFile(file: File) {
    this.selectedFile = file;


    this.auth.setRegisterPhoto(file);

    const reader = new FileReader();
    reader.onload = () => {
      this.previewUrl = reader.result as string;
    };
    reader.readAsDataURL(file);
  }
}
