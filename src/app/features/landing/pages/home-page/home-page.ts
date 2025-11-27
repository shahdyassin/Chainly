import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Header } from '../../../landing/components/header/header';
import { HeroSection } from '../../../landing/components/hero-section/hero-section';
import { FeaturesSection } from '../../../landing/components/features-section/features-section';
import { AnalyticsSection } from '../../../landing/components/analytics-section/analytics-section';
import { ChartsAnalytics } from '../../../landing/components/charts-analytics/charts-analytics';
import { TestimonialsSection } from '../../../landing/components/testimonials-section/testimonials-section';
import { CtaSection } from '../../../landing/components/cta-section/cta-section';
import { Footer } from '../../../landing/components/footer/footer';
import { VisionSection } from "../../components/vision-section/vision-section";

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [
    CommonModule,
    Header,
    HeroSection,
    FeaturesSection,
    AnalyticsSection,
    ChartsAnalytics,
    TestimonialsSection,
    CtaSection,
    Footer,
    VisionSection
],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
})
export class HomePage {}
