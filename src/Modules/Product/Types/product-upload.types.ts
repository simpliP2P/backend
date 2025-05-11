export interface ProductUploadDto {
  name: string;
  description: string;
  unitPrice: number;
  currency?: string;
  stockQty: number;
  stockQtyAlert?: number;
  unitOfMeasure?: string;
  category: string; // Category name or ID
  productCode?: string;
  image_url?: string;
}

export interface ProductUploadResult {
  totalProcessed: number;
  successCount: number;
  failedCount: number;
  failedRows: {
    rowNumber: number;
    data: any;
    error: string;
  }[];
}
