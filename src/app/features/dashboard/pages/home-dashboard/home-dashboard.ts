// src/app/features/dashboard/pages/home-dashboard/home-dashboard.ts
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import {
  NgApexchartsModule,
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexDataLabels,
  ApexStroke,
  ApexFill,
  ApexResponsive,
  ApexNonAxisChartSeries,
  ApexLegend,
  ApexYAxis,
  ApexGrid,
  ApexPlotOptions,
} from 'ng-apexcharts';
import { AuthService } from '../../../../core/services/auth.service';

// شكل الريسبونس اللي بيرجع من الـ API
interface OrdersResponse {
  items?: any[];
}

type LineChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  dataLabels: ApexDataLabels;
  stroke: ApexStroke;
  fill: ApexFill;
  grid: ApexGrid;
};

type DonutChartOptions = {
  series: ApexNonAxisChartSeries;
  chart: ApexChart;
  labels: string[];
  responsive: ApexResponsive[];
  legend: ApexLegend;
  plotOptions: ApexPlotOptions;
  colors?: string[];
  dataLabels?: ApexDataLabels;
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  templateUrl: './home-dashboard.html',
  styleUrl: './home-dashboard.scss',
  imports: [CommonModule, NgApexchartsModule],
})
export class HomeDashboard implements OnInit {
  userName = '';
  todayLabel = '';

  orders: any[] = [];
  hasData = false;

  risingDemands: Array<{
    productName: string;
    stock: number;
    increasePercent: number;
  }> = [];

  deliveredCount = 0;
  totalPlacedCount = 0;
  pendingCount = 0;
  cancelledCount = 0;

  totalOrdersChartOptions: LineChartOptions = {
    series: [{ name: 'Total Orders', data: [] }],
    chart: {
      type: 'line',
      height: 260,
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    xaxis: {
      categories: [],
      labels: {
        style: {
          colors: '#9ca3af',
          fontSize: '11px',
        },
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      min: 0,
      max: 900,
      tickAmount: 9,
      labels: {
        style: {
          colors: '#d1d5db',
          fontSize: '11px',
        },
      },
    },
    dataLabels: { enabled: false },
    stroke: { curve: 'straight', width: 2 },
    fill: { opacity: 1 },
    grid: {
      borderColor: '#f3f4f6',
      strokeDashArray: 0,
      xaxis: { lines: { show: false } },
    },
  };

  // الدونات ثابتة، مش مرتبطة بالـ Orders API
  insightsDonutOptions: DonutChartOptions = {
    series: [100], // دايرة كاملة لكن بنكتب 0% في الليبل
    labels: ['Defected Products'],
    chart: {
      type: 'donut',
      height: 260,
    },
    legend: {
      show: false,
    },
    colors: ['#3CCFCF'],
    dataLabels: {
      enabled: false,
    },
    plotOptions: {
      pie: {
        donut: {
          size: '75%',
          labels: {
            show: true,
            name: {
              show: true,
              formatter: () => 'Defected Products',
              fontSize: '12px',
              color: '#f97373',
            },
            value: {
              show: true,
              formatter: () => '0%',
              fontSize: '16px',
              fontWeight: 600,
              color: '#f97373',
            },
            total: {
              show: false,
            },
          },
        },
      },
    },
    responsive: [
      {
        breakpoint: 600,
        options: {
          chart: { height: 220 },
        },
      },
    ],
  };

  constructor(private http: HttpClient, private auth: AuthService) {}

  ngOnInit(): void {
    this.userName = this.auth.getCurrentUserName() || 'User';
    this.todayLabel = this.formatToday();
    this.loadOrders();
  }

  private formatToday(): string {
    const d = new Date();
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  loadOrders() {
    this.http
      // هنا عرّفنا النوع صريح: يا إما object فيه items[] يا إما array على طول
      .get<OrdersResponse | any[]>(
        'https://chainly.azurewebsites.net/api/Orders?pageNumber=1&pageSize=10&status=null&search=null'
      )
      .subscribe({
        next: (res) => {
          let items: any[] = [];

          if (Array.isArray(res)) {
            // الريسبونس نفسه array
            items = res;
          } else if (res && Array.isArray(res.items)) {
            // الريسبونس فيه items
            items = res.items;
          }

          this.orders = items; // هنا بقى نوعه any[] صريح
          this.hasData = this.orders.length > 0;

          this.buildCountersFromOrders();
          this.buildChartsFromOrders();

          this.risingDemands = this.hasData
            ? [
                {
                  productName: 'Traveller Backpack',
                  stock: 60,
                  increasePercent: 15,
                },
                {
                  productName: 'Traveller Backpack',
                  stock: 80,
                  increasePercent: 12,
                },
              ]
            : [];
        },
        error: () => {
          this.hasData = false;
          this.resetCharts();
        },
      });
  }

  private resetCharts() {
    this.totalOrdersChartOptions = {
      ...this.totalOrdersChartOptions,
      series: [{ name: 'Total Orders', data: [] }],
    };
    // الدونات ثابتة، مش بنلمسها هنا
  }

  private buildCountersFromOrders() {
    this.deliveredCount = this.orders.filter(
      (o) => o.status === 'Delivered'
    ).length;
    this.pendingCount = this.orders.filter(
      (o) => o.status === 'Pending'
    ).length;
    this.cancelledCount = this.orders.filter(
      (o) => o.status === 'Cancelled'
    ).length;
    this.totalPlacedCount = this.orders.length;
  }

  private buildChartsFromOrders() {
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    const countsPerMonth = new Array(12).fill(0);

    if (this.hasData) {
      this.orders.forEach((o) => {
        const monthIndex = new Date(o.createdAt ?? Date.now()).getMonth();
        countsPerMonth[monthIndex] += 1;
      });
    }

    this.totalOrdersChartOptions = {
      ...this.totalOrdersChartOptions,
      series: [{ name: 'Total Orders', data: countsPerMonth }],
      xaxis: {
        ...this.totalOrdersChartOptions.xaxis,
        categories: months,
      },
    };
  }
}
