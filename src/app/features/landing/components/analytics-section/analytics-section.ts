import { Component } from '@angular/core';
import { CommonModule } from "@angular/common"

@Component({
  selector: 'app-analytics-section',
  imports: [CommonModule],
  templateUrl: './analytics-section.html',
  styleUrl: './analytics-section.scss',
})
export class AnalyticsSection {
 heroMetrics = [
  { value: '95%',   label: 'Forecast Accuracy' },
  { value: '874kg', label: 'Carbon Saved' },
  { value: '25%',   label: 'Cost Reduction' },
  { value: '24',    label: 'Hour Support' },
];
}
