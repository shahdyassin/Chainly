import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from "@angular/common";
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-header',
  imports: [CommonModule , RouterLink],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  @Output() navigate = new EventEmitter<string>();
  mobileMenuOpen = false

  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen
  }

  scrollToSection(sectionId: string) {
  const element = document.getElementById(sectionId);
  if (element) {
    const headerOffset = 90;
    const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
    const offsetPosition = elementPosition - headerOffset;

    window.scrollTo({
      top: offsetPosition,
      behavior: "smooth"
    });

    this.mobileMenuOpen = false;
  }
  console.log(document.getElementById(sectionId));
}

}
