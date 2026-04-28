import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import {
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import {
  SimulationService,
  ProductionLine
} from '../../../../core/services/simulation.service';

@Component({
  selector: 'app-simulation',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './simulation-list.html',
  styleUrls: ['./simulation-list.scss']
})
export class SimulationList implements OnInit {

  private fb = inject(FormBuilder);
  private api = inject(SimulationService);

  lines: ProductionLine[] = [];
  isCustomLine = true;
  loading = false;

  result: any = null;

  form = this.fb.group({
    productionLineId: this.fb.control<number | null>(null),

    maximumSpeed: this.fb.control<number | null>(null),
    ratedPower: this.fb.control<number | null>(null),
    maximumTemperature: this.fb.control<number | null>(null),
    maximumCurrent: this.fb.control<number | null>(null),

    throughput: this.fb.control<number | null>(1, Validators.required),
    environmentalTemperature: this.fb.control<number | null>(1, Validators.required),
    operatingTime: this.fb.control<number | null>(1, Validators.required),
    demand: this.fb.control<number | null>(1, Validators.required)
  });


  showLineDropdown = false;
  isTypingNewLine = false;
  newLineName = '';

  toggleLineDropdown() {
    this.showLineDropdown = !this.showLineDropdown;
  }

  getSelectedLineName(): string {
    const id = this.form.value.productionLineId;
    const item = this.lines.find(x => x.id === id);
    return item?.lineName || '';
  }


  selectCustomLine() {
    this.showLineDropdown = false;
    this.isCustomLine = true;
    this.isTypingNewLine = true;

    this.form.patchValue({
      productionLineId: null,
      maximumSpeed: null,
      ratedPower: null,
      maximumTemperature: null,
      maximumCurrent: null
    });
  }


  selectExistingLine(item: any) {
    this.showLineDropdown = false;
    this.isCustomLine = false;
    this.isTypingNewLine = false;

    this.form.patchValue({
      productionLineId: item.id,
      maximumSpeed: item.maximumSpeed ?? null,
      ratedPower: item.ratedPower ?? null,
      maximumTemperature: item.maximumTemperature ?? null,
      maximumCurrent: item.maximumCurrent ?? null
    });
  }

  ngOnInit(): void {
    this.loadLines();
  }

  loadLines() {
    this.api.getProductionLines().subscribe({
      next: (res) => {
        this.lines = res.items || [];
      }
    });
  }

  onLineChange(event: any) {
    const value = event.target.value;

    if (value === 'custom') {
      this.isCustomLine = true;

      this.form.patchValue({
        productionLineId: null,
        maximumSpeed: null,
        ratedPower: null,
        maximumTemperature: null
      });

      return;
    }

    const id = Number(value);
    const selected = this.lines.find(x => x.id === id);

    this.isCustomLine = false;

    this.form.patchValue({
      productionLineId: id,
      maximumSpeed: selected?.maximumSpeed ?? null,
      ratedPower: selected?.ratedPower ?? null,
      maximumTemperature: selected?.maximumTemperature ?? null,
      maximumCurrent: selected?.maximumCurrent ?? null
    });
  }

  runSimulation() {

    if (this.form.invalid) return;

    this.loading = true;

    this.api.runSimulation(this.form.getRawValue() as any).subscribe({
      next: (res) => {

        this.result = {
          load: res.simulation.load,
          production: res.simulation.production,
          temperature: res.simulation.temperature,
          decision: res.simulation.isOk ? 'OK' : 'Not Feasible',
          analysis: res.aiAnalysis
        };

        this.loading = false;
      },

      error: (err) => {
        console.log(err);
        this.loading = false;
      }
    });
  }

  createNewLine() {

    const name = this.newLineName.trim();

    if (!name) return;

    const payload = {
      lineName: name,
      description: null,
      maximumSpeed: this.form.value.maximumSpeed,
      ratedPower: this.form.value.ratedPower,
      maximumTemperature: this.form.value.maximumTemperature,
      maximumCurrent: this.form.value.maximumCurrent
    };

    this.api.createProductionLine(payload).subscribe({
      next: (res: any) => {

        this.isTypingNewLine = false;
        this.isCustomLine = false;

        this.loadLines();

        this.form.patchValue({
          productionLineId: res.id
        });

        this.newLineName = '';
      }
    });
  }
}
