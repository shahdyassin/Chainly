import { Component } from '@angular/core';
import { CommonModule } from "@angular/common"

@Component({
  selector: 'app-vision-section',
  imports: [CommonModule],
  templateUrl: './vision-section.html',
  styleUrl: './vision-section.scss',
})
export class VisionSection {
   visionCards = [
    {
      title: "Our Mission",
      description:
        "To transform supply chain management through innovative technology, making it transparent, efficient, and sustainable for businesses worldwide.",
      image: "images/vision/our-mission.jpg",
    },
    {
      title: "Global Impact",
      description:
        "Empowering factories and suppliers to reduce waste, minimize carbon footprint, and deliver excellence at every stage of production.",
      image: "images/vision/global-impact.jpg",
    },
    {
      title: "Future Ready",
      description:
        "Leveraging AI and real-time analytics to keep you ahead of challenges, from quality control to delivery optimization.",
      image: "images/vision/future-ready.svg",
    },
  ]
}
