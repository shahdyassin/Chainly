import { Component, OnInit } from '@angular/core';
import { ProductsService, Product } from '../../../../core/services/products.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

type UploadState = 'uploading' | 'uploaded' | 'failed';

interface UploadItem {
  id: number;
  file: File;
  progress: number;
  state: UploadState;
  warningText?: string;
}

@Component({
  selector: 'app-rising-demands',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rising-demands.html',
  styleUrl: './rising-demands.scss',
})
export class RisingDemands implements OnInit {

  products: Product[] = [];

  stockFilter: 'all' | 'in' | 'out' | 'low' = 'all';
  sortDirection: 'asc' | 'desc' | '' = '';

  pageNumber = 1;
  pageSize = 10;
  totalPages = 0;
  totalCount = 0;

  searchText = '';

  inStockCount = 0;
  outStockCount = 0;
  lowStockCount = 0;


  showPredictionModal = false;
  predictionLoading = false;
  predictedProductName = '';
  predictionResult = '';
  predictionTrend: 'up' | 'down' | '' = '';


  showDeleteModal = false;
  productToDelete: Product | null = null;


  isImportOpen = false;
  importStep: 'instructions' | 'upload' | 'success' = 'instructions';
  uploads: UploadItem[] = [];
  uploadIdCounter = 0;

  showFilterPopup = false;

  minStock?: number;
  maxStock?: number;

  tempMin?: number;
  tempMax?: number;

  hasActiveFilters = false;

  constructor(private productsService: ProductsService) { }

  ngOnInit(): void {
    this.loadProducts();
  }



  loadProducts(): void {

    this.productsService
      .getProducts(
        this.pageNumber,
        this.pageSize,
        this.searchText,
        this.sortDirection,
        this.minStock,
        this.maxStock
      )
      .subscribe(res => {

        this.products = res.items ?? [];

        this.totalCount = res.totalCount;
        this.totalPages = res.totalPages;
        this.pageNumber = res.pageNumber;

      });

  }
  calculateCounts() {
    this.productsService.getProducts(1, 1000, '').subscribe(res => {
      const items = res.items ?? [];
      this.inStockCount = items.filter(p => p.stock > 0).length;
      this.outStockCount = items.filter(p => p.stock === 0).length;
      this.lowStockCount = items.filter(p => p.stock > 0 && p.stock <= 10).length;
    });
  }

  onSearchChange() { this.pageNumber = 1; this.loadProducts(); }
  prevPage() { if (this.pageNumber > 1) { this.pageNumber--; this.loadProducts(); } }
  nextPage() { if (this.pageNumber < this.totalPages) { this.pageNumber++; this.loadProducts(); } }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.pageNumber = page;
      this.loadProducts();
    }
  }

  setStockFilter(type: 'all' | 'in' | 'out' | 'low') {
    this.stockFilter = type;
    this.pageNumber = 1;
    this.loadProducts();
  }

  toggleSort() {
    if (!this.sortDirection) this.sortDirection = 'asc';
    else if (this.sortDirection === 'asc') this.sortDirection = 'desc';
    else this.sortDirection = 'asc';
    this.loadProducts();
  }

  get pagesArray(): (number | string)[] {
    const pages: (number | string)[] = [];
    if (this.totalPages <= 5) {
      for (let i = 1; i <= this.totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (this.pageNumber > 3) pages.push('…');
      const start = Math.max(2, this.pageNumber - 1);
      const end = Math.min(this.totalPages - 1, this.pageNumber + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (this.pageNumber < this.totalPages - 2) pages.push('…');
      pages.push(this.totalPages);
    }
    return pages;
  }

  isNumber(value: number | string): value is number {
    return typeof value === 'number';
  }

  get startIndex(): number { return (this.pageNumber - 1) * this.pageSize; }
  get endIndex(): number { return Math.min(this.startIndex + this.pageSize, this.totalCount); }



  predictProduct(product: Product) {
    this.showPredictionModal = true;
    this.predictionLoading = true;
    this.predictedProductName = product.name;
    this.predictionResult = '';
    this.predictionTrend = '';

    this.productsService.predictDemand(product.id).subscribe({
      next: (res: any) => {
        const percent = res?.predicted_change_percentage;

        if (percent !== undefined) {
          if (percent >= 0) {
            this.predictionTrend = 'up';
            this.predictionResult = `The demand is expected to increase by ${percent}% over the next week`;
          } else {
            this.predictionTrend = 'down';
            this.predictionResult = `The demand is expected to decrease by ${Math.abs(percent)}% over the next week`;
          }
        } else {
          this.predictionResult = 'Prediction received but percentage not found';
        }
        this.predictionLoading = false;
      },
      error: () => {
        this.predictionTrend = 'down';
        this.predictionResult = 'Prediction failed';
        this.predictionLoading = false;
      }
    });
  }

  closePredictionModal() { this.showPredictionModal = false; }



  deleteProduct(product: Product) {
    this.productToDelete = product;
    this.showDeleteModal = true;
  }

  closeDeleteModal() {
    this.showDeleteModal = false;
    this.productToDelete = null;
  }

  confirmDelete() {
    if (!this.productToDelete) return;
    this.productsService.deleteProduct(this.productToDelete.id).subscribe(() => {
      this.closeDeleteModal();
      this.loadProducts();
    });
  }



  openImport() {
    this.isImportOpen = true;
    this.importStep = 'instructions';
    this.uploads = [];
  }

  closeImport() {
    this.isImportOpen = false;
  }

  openUploadStep() {
    this.importStep = 'upload';
  }

  continueAfterSuccess() {
    this.closeImport();
    this.loadProducts();
  }

  onBrowseFile(event: any) {
    const files = event.target.files;
    this.handleFiles(files);
  }

  onDropFile(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer?.files) this.handleFiles(event.dataTransfer.files);
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
  }

  handleFiles(fileList: FileList) {
    Array.from(fileList).forEach(file => {
      const item: UploadItem = {
        id: ++this.uploadIdCounter,
        file,
        progress: 0
      } as UploadItem;

      item.state = 'uploading';
      this.uploads.push(item);
      this.uploadToServer(item);
    });
  }

  uploadToServer(item: UploadItem) {
    this.productsService.importProducts(item.file).subscribe({
      next: () => {
        item.progress = 100;
        item.state = 'uploaded';
      },
      error: () => {
        item.state = 'failed';
        item.warningText = "This file doesn't match the required specifications. Please upload a valid file.";
      }
    });
  }

  retryUpload(item: UploadItem) {
    item.state = 'uploading';
    item.progress = 0;
    this.uploadToServer(item);
  }

  removeUpload(item: UploadItem) {
    this.uploads = this.uploads.filter(x => x.id !== item.id);
  }

  confirmUpload() {
    this.importStep = 'success';
  }

  get canConfirmUpload() {
    return this.uploads.some(u => u.state === 'uploaded') &&
      !this.uploads.some(u => u.state === 'uploading');
  }

  trackByUploadId(i: number, item: UploadItem) {
    return item.id;
  }

  formatSize(bytes: number) {
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  openFilter() {
    this.tempMin = this.minStock;
    this.tempMax = this.maxStock;
    this.showFilterPopup = true;
  }

  closeFilter() {
    this.showFilterPopup = false;
  }

  applyFilter() {

    if (
      this.tempMin !== undefined &&
      this.tempMax !== undefined &&
      this.tempMin > this.tempMax
    ) {
      alert("Min stock cannot be greater than Max stock");
      return;
    }

    this.minStock = this.tempMin;
    this.maxStock = this.tempMax;

    this.hasActiveFilters =
      this.minStock !== undefined ||
      this.maxStock !== undefined;

    this.pageNumber = 1;
    this.showFilterPopup = false;

    this.loadProducts();
  }

  clearFilters() {
    this.minStock = undefined;
    this.maxStock = undefined;

    this.tempMin = undefined;
    this.tempMax = undefined;

    this.hasActiveFilters = false;

    this.loadProducts();
  }
}
