import { Component } from '@angular/core';
import { CommonModule } from "@angular/common";
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-hero-section',
  imports: [CommonModule , RouterLink],
  templateUrl: './hero-section.html',
  styleUrl: './hero-section.scss',
})
export class HeroSection {

}
