import { Component } from '@angular/core';
import { CommonModule } from "@angular/common";
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AiIcon, EyeIcon, TreeIcon } from '../../../../shared/components/constants/icons';

@Component({
  selector: 'app-testimonials-section',
  imports: [CommonModule],
  templateUrl: './testimonials-section.html',
  styleUrl: './testimonials-section.scss',
})
export class TestimonialsSection {
  testimonials: {
     icon: SafeHtml;
     bgColor: string;
     iconBg: string;
     iconColor: string;
     title: string;
     description: string;
     gradient: boolean
    }[] = [];

   constructor (private sanitizer: DomSanitizer){
    this.testimonials = [
    {
      gradient: false,
      bgColor: "#ffffff",
      iconBg: "#3EA397",
      iconColor: "#FFFFFF",
      icon: this.sanitize(EyeIcon),
      title: "Complete <br> Visibility",
      description:
        "Track every order, supplier,<br>and production line from a<br>single, unified platform.",
    },
    {
      gradient: true,
      bgColor: "linear-gradient(70deg, #3EA397, #9DEAE1)",
      iconBg: "#FFFFFF",
      iconColor: "#3EA397",
      icon: this.sanitize(TreeIcon),
      title: "Sustainability <br> First",
      description:
        "Monitor and reduce your<br>carbon footprint with<br>actionable environmental<br>insights.",
    },
    {
      gradient: false,
      bgColor: "#ffffff",
      iconBg: "#3EA397",
      iconColor: "#FFFFFF",
      icon: this.sanitize(AiIcon),
      title: "AI Powered <br> Intelligence",
      description:
        "Advanced defect<br>detection and predictive<br>analytics keep quality high<br>and costs low.",
    },
  ];
   }

sanitize(svg: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(svg);
  }
}
