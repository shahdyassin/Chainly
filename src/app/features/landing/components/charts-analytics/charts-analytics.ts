import { Component } from '@angular/core';
import { CommonModule } from "@angular/common"

@Component({
  selector: 'app-charts-analytics',
  imports: [CommonModule],
  templateUrl: './charts-analytics.html',
  styleUrl: './charts-analytics.scss',
})
export class ChartsAnalytics {
analyticsCards = [
    {
      title: "Manage Every Step of Your Supply Chain",
      subtitle: "Real-time tracking and management",
      icon: "fa-chart-line",
      color: "#20b2aa",
    },
  ]

  metrics = [
    { title: "Active Clients", value: "1", color: "#e91e63" },
    { title: "Total Projects", value: "120", color: "#f39c12" },
    { title: "Total Hours", value: "10", color: "#3498db" },
    { title: "Total Value", value: "90", color: "#20b2aa" },
  ]
}
