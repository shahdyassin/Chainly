import { Component } from '@angular/core';
import { CommonModule } from "@angular/common"
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { chatIcon, forecastIcon, qualityIcon, supplierIcon } from '../../../../shared/components/constants/icons';

@Component({
  selector: 'app-features-section',
  imports: [CommonModule],
  templateUrl: './features-section.html',
  styleUrl: './features-section.scss',
})
export class FeaturesSection {
features: {
     icon: SafeHtml;
     iconBg: string;
     bgGradient: string;
     title: string;
     description: string;
    }[] = [];

  constructor (private sanitizer: DomSanitizer){
    this.features = [
    {
      icon: this.sanitize(forecastIcon),
      iconBg: "#FFFFFF",
      bgGradient: 'linear-gradient(390deg, #FFFFFF 0%, #FFFFFF 25%, #e4f8f5 60%)',
      title: "AI Demand Forecasting",
      description:
        "Stay ahead of every surge. Chainly predicts and monitors demand fluctuations, helping you plan production, manage inventory, and avoid costly shortages or overstocking.",
    },
    {
      icon: this.sanitize(chatIcon),
      iconBg: "#FFFFFF",
      bgGradient: 'linear-gradient(390deg, #FFFFFF 0%, #FFFFFF 25%, #e4f8f5 60%)',
      title: "Smart Chatbot",
      description: "Our AI-powered chatbot allows customers to check order status, delivery time, and factory updates anytime, anywhere, with zero wait time.",
    },
    {
      icon: this.sanitize(qualityIcon),
      iconBg: "#FFFFFF",
      bgGradient: 'linear-gradient(390deg, #FFFFFF 0%, #FFFFFF 25%, #e4f8f5 60%)',
      title: "Computer Vision Quality Control",
      description:
        "Using advanced image and video analysis, Chainly detects defects in real time, calculates defect ratios, and ensures consistent production quality.",
    },
    {
      icon: this.sanitize(supplierIcon),
      iconBg: "#FFFFFF",
      bgGradient: 'linear-gradient(390deg, #FFFFFF 0%, #FFFFFF 25%, #e4f8f5 60%)',
      title: "Supplier Recommendation",
      description: "Chainly analyzes supplier performance, distance, and reliability to recommend the best fit for your current needs — optimizing both cost and efficiency.",
    },
  ]
  }
sanitize(svg: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(svg);
  }
}
