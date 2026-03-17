import { Component, OnInit, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CamerasService, Camera } from '../../../../core/services/camera.service';
import { ProductionLinesService, ProductionLine }
  from '../../../../core/services/production-lines.service';


@Component({
  selector: 'app-cameras',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './camera-list.html',
  styleUrl: './camera-list.scss'
})
export class CameraList implements OnInit {


  constructor(
    private camerasService: CamerasService,
    private productionLinesService: ProductionLinesService,
    private eRef: ElementRef
  ) { }

  @HostListener('document:click', ['$event'])
  closeDropdown(event: Event) {
    if (!this.eRef.nativeElement.contains(event.target)) return;
    const target = event.target as HTMLElement;
    if (!target.closest('.custom-dropdown')) {
      this.showLineDropdown = false;
    }
  }

  cameras: Camera[] = [];

  pageNumber = 1;
  pageSize = 10;

  totalPages = 0;
  totalCount = 0;

  searchText = '';

  productionLines: ProductionLine[] = [];

  showAddModal = false;

  newCamera = {
    productionLineId: 0,
    cameraSource: ''
  };

  showLineDropdown = false;
  selectedAddLineId?: number;

  errorMessage = '';

  showEditModal = false;

  editCamera = {
    id: 0,
    productionLineId: 0,
    cameraSource: ''
  };

  selectedEditLineId?: number;

  isDeleteOpen = false;
  selectedCamera?: Camera;


  ngOnInit() {

    this.loadCameras();
    this.loadProductionLines();

  }

  loadCameras() {

    this.camerasService
      .getCameras(this.pageNumber, this.pageSize, this.searchText)
      .subscribe(res => {
        this.cameras = res.items;
        this.totalPages = res.totalPages;
        this.totalCount = res.totalCount;

      });

  }

  loadProductionLines() {
    this.productionLinesService
      .getAll(1, 1000)
      .subscribe(res => {
        this.productionLines = res.items;
      });
  }

  onSearchChange() {
    this.pageNumber = 1;
    this.loadCameras();
  }

  prevPage() {
    if (this.pageNumber > 1) {
      this.pageNumber--;
      this.loadCameras();
    }
  }

  nextPage() {
    if (this.pageNumber < this.totalPages) {
      this.pageNumber++;
      this.loadCameras();
    }
  }

  openAdd() {

    this.newCamera = {
      productionLineId: 0,
      cameraSource: ''
    };

    this.selectedAddLineId = undefined;
    this.errorMessage = '';

    this.showAddModal = true;

  }

  closeAdd() {
    this.showAddModal = false;
  }

  confirmAdd() {
    this.errorMessage = '';

    if (!this.newCamera.productionLineId || !this.newCamera.cameraSource)
      return;

    this.camerasService
      .createCamera(this.newCamera)
      .subscribe({
        next: () => {

          this.showAddModal = false;

          this.newCamera = {
            productionLineId: 0,
            cameraSource: ''
          };

          this.selectedAddLineId = undefined;
          this.loadCameras();
        },

        error: (err) => {
          if (err.error?.includes('already has a camera')) {
            this.errorMessage = 'This production line already has a camera.';
          } else {
            this.errorMessage = 'Failed to add camera.';
          }

        }
      });
  }

  toggleLineDropdown(e: Event) {
    e.preventDefault();
    e.stopPropagation();
    this.showLineDropdown = !this.showLineDropdown;

  }
  selectLine(line: any, e?: Event) {

    e?.stopPropagation();

    if (this.showEditModal) {

      this.editCamera.productionLineId = line.id;
      this.selectedEditLineId = line.id;

    } else {

      this.newCamera.productionLineId = line.id;
      this.selectedAddLineId = line.id;

    }

    this.showLineDropdown = false;

  }
  getSelectedLineName(): string {

    const id = this.showEditModal
      ? this.selectedEditLineId
      : this.selectedAddLineId;

    const line = this.productionLines.find(l => l.id === id);

    return line ? line.lineName : 'Select Production Line';
  }

  onModalClick(e: Event) {
    const target = e.target as HTMLElement;
    if (!target.closest('.custom-dropdown')) {
      this.showLineDropdown = false;
    }
    e.stopPropagation();
  }

  getProductionLineId(name: string): number {

    const line = this.productionLines.find(l => l.lineName === name);
    return line ? line.id : 0;
  }

  openEdit(camera: any) {
    const line = this.productionLines
      .find(l => l.lineName === camera.productionLineName);

    this.editCamera = {
      id: camera.id,
      cameraSource: camera.cameraSource,
      productionLineId: line ? line.id : 0
    };

    this.selectedEditLineId = this.editCamera.productionLineId;

    this.showEditModal = true;
  }

  closeEdit() {
    this.showEditModal = false;
  }

  confirmEdit() {
    this.errorMessage = '';

    if (!this.editCamera.productionLineId || !this.editCamera.cameraSource)
      return;

    this.camerasService
      .updateCamera(this.editCamera.id, {
        productionLineId: this.editCamera.productionLineId,
        cameraSource: this.editCamera.cameraSource
      })
      .subscribe({
        next: () => {
          this.showEditModal = false;
          this.loadCameras();
        },

        error: (err) => {
          if (err.error?.includes('already has a camera')) {
            this.errorMessage =
              'This production line already has a camera.';
          } else {
            this.errorMessage = 'Failed to update camera.';
          }
        }
      });
  }

  openDelete(camera: Camera) {
    this.selectedCamera = camera;
    this.isDeleteOpen = true;
  }

  closeDelete() {
    this.isDeleteOpen = false;
    this.selectedCamera = undefined;
  }

  confirmDelete() {
    if (!this.selectedCamera) return;
    this.camerasService
      .deleteCamera(this.selectedCamera.id)
      .subscribe(() => {
        this.closeDelete();
        this.loadCameras();
      });
  }
}
