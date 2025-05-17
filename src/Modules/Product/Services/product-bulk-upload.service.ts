import * as XLSX from "xlsx";
import * as Papa from "papaparse";
import { Readable } from "stream";
import { Injectable, BadRequestException, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import { Product } from "../Entities/product.entity";
import { OrganisationCategory } from "src/Modules/Organisation/Entities/organisation-category.entity";
import {
  ProductUploadDto,
  ProductUploadResult,
} from "../Types/product-upload.types";
import { ProductService } from "./product.service";
import * as fs from "fs";
import { UserOrganisationRepository } from "src/Modules/Organisation/Repositories/user-organisation.repository";
import { EmailServices } from "src/Modules/Mail/Services/mail.service";

@Injectable()
export class ProductBulkUploadService {
  private readonly logger = new Logger(ProductBulkUploadService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(OrganisationCategory)
    private readonly categoryRepository: Repository<OrganisationCategory>,
    private readonly productService: ProductService,
    private readonly userOrganisationRepository: UserOrganisationRepository,
    private readonly emailService: EmailServices,
  ) {}

  /**
   * Process file upload and convert to product data
   */
  async processProductFileUpload(
    file: Express.Multer.File,
    organisationId: string,
    userId: string,
  ) {
    // Parse file based on mimetype
    let productsData: ProductUploadDto[] = [];
    let fileBuffer: Buffer;

    try {
      // Get file buffer - handle both disk storage and memory storage
      if (file.buffer) {
        // If file is in memory (buffer exists)
        fileBuffer = file.buffer;
        this.logger.log("Using file buffer from memory");
      } else if (file.path) {
        // If file was saved to disk (path exists)
        fileBuffer = fs.readFileSync(file.path);
        this.logger.log(`Reading file from path: ${file.path}`);
      } else {
        throw new BadRequestException("File data is not accessible");
      }

      if (file.mimetype === "text/csv" || file.originalname.endsWith(".csv")) {
        productsData = await this.parseCSV(fileBuffer);
      } else if (
        file.mimetype ===
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        file.mimetype === "application/vnd.ms-excel" ||
        file.originalname.endsWith(".xlsx") ||
        file.originalname.endsWith(".xls")
      ) {
        productsData = this.parseExcel(fileBuffer);
      } else {
        throw new BadRequestException(
          "Unsupported file type. Please upload CSV or Excel file.",
        );
      }

      // Clean up file if it was saved to disk
      if (file.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    } catch (error) {
      // Clean up file if it was saved to disk
      if (file.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }

      this.logger.error(`Error processing file: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to parse file: ${error.message}`);
    }

    if (!productsData.length) {
      throw new BadRequestException("No valid product data found in the file");
    }

    // Perform bulk upload
    this.bulkCreateProducts(productsData, organisationId, userId);
  }

  /**
   * Parse CSV file buffer to product data
   */
  private parseCSV(buffer: Buffer): Promise<ProductUploadDto[]> {
    return new Promise((resolve, reject) => {
      try {
        const stream = new Readable();
        stream.push(buffer);
        stream.push(null);

        Papa.parse(stream, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          transformHeader: (header) => header.trim(),
          complete: (results) => {
            if (results.errors && results.errors.length > 0) {
              this.logger.error("CSV parsing errors:", results.errors);
              reject(
                new BadRequestException(
                  `CSV parsing error: ${results.errors[0].message}`,
                ),
              );
              return;
            }

            try {
              const transformedData = this.validateAndTransformProducts(
                results.data,
              );
              resolve(transformedData);
            } catch (error) {
              reject(
                new BadRequestException(
                  `Data validation error: ${error.message}`,
                ),
              );
            }
          },
          error: (error) => {
            this.logger.error("Papa Parse error:", error);
            reject(
              new BadRequestException(`CSV parsing error: ${error.message}`),
            );
          },
        });
      } catch (error) {
        reject(new BadRequestException(`Error reading CSV: ${error.message}`));
      }
    });
  }

  /**
   * Parse Excel file buffer to product data
   */
  private parseExcel(buffer: Buffer): ProductUploadDto[] {
    try {
      const workbook = XLSX.read(buffer, { type: "buffer" });

      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new BadRequestException("No sheets found in the Excel file");
      }

      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      const data = XLSX.utils.sheet_to_json(worksheet, {
        raw: false,
        defval: "",
      });

      return this.validateAndTransformProducts(data);
    } catch (error) {
      this.logger.error("Excel processing error:", error);
      throw new BadRequestException(`Excel processing error: ${error.message}`);
    }
  }

  /**
   * Validate and transform raw data to product DTOs
   */
  private validateAndTransformProducts(data: any[]): ProductUploadDto[] {
    if (!data || data.length === 0) {
      throw new BadRequestException("No data found in the uploaded file");
    }

    return data.map((row, index) => {
      try {
        // Map CSV/Excel columns to DTO properties
        // Handle potential different column naming conventions
        const product: ProductUploadDto = {
          name:
            row.name || row.Name || row.PRODUCT_NAME || row.product_name || "",
          description:
            row.description || row.Description || row.DESCRIPTION || "",
          unitPrice: parseFloat(
            row.unitPrice || row.unit_price || row.price || row.Price || 0,
          ),
          currency: row.currency || row.Currency || "NGN",
          stockQty: parseInt(
            row.stockQty || row.stock_qty || row.quantity || row.Quantity || 0,
            10,
          ),
          stockQtyAlert: row.stockQtyAlert || row.stock_qty_alert || null,
          unitOfMeasure:
            row.unitOfMeasure || row.unit_of_measure || row.UOM || null,
          category: row.category || row.Category || row.CATEGORY || "",
          productCode:
            row.productCode || row.product_code || row.sku || row.SKU || null,
          image_url: row.image_url || row.imageUrl || row.image || null,
        };

        // Basic validation
        if (!product.name)
          throw new Error(`Row ${index + 1}: Product name is required`);
        if (!product.description)
          throw new Error(`Row ${index + 1}: Product description is required`);
        if (isNaN(product.unitPrice) || product.unitPrice <= 0)
          throw new Error(`Row ${index + 1}: Valid product price is required`);
        if (isNaN(product.stockQty) || product.stockQty < 0)
          throw new Error(`Row ${index + 1}: Valid stock quantity is required`);
        if (!product.category)
          throw new Error(`Row ${index + 1}: Product category is required`);

        return product;
      } catch (error) {
        // Add row number for better error messages
        throw new Error(`Row ${index + 1}: ${error.message}`);
      }
    });
  }

  /**
   * Bulk create products with optimized database operations
   */
  async bulkCreateProducts(
    productsData: ProductUploadDto[],
    organisationId: string,
    userId: string,
  ): Promise<void> {
    const result: ProductUploadResult = {
      totalProcessed: productsData.length,
      successCount: 0,
      failedCount: 0,
      failedRows: [],
    };

    this.logger.log(
      `Starting bulk product creation for organisationId: ${organisationId}`,
    );
    
    try {
      // 1. Deduplication: Fetch existing product names
      const existingProducts = await this.productRepository.find({
        where: {
          organisation: { id: organisationId },
          name: In(productsData.map((p) => p.name)),
        },
        select: { name: true },
      });
      const existingProductNames = new Set(existingProducts.map((p) => p.name));

      // 2. Fetch existing categories
      const categoryNames = [...new Set(productsData.map((p) => p.category))];
      const existingCategories = await this.categoryRepository.find({
        where: {
          organisation: { id: organisationId },
          name: In(categoryNames),
        },
      });
      const categoryMap = new Map(existingCategories.map((c) => [c.name, c]));

      // 3. Identify missing categories
      const missingCategoryNames = categoryNames.filter(
        (name) => !categoryMap.has(name),
      );

      // 4. Insert missing categories (bulk, ignore duplicates)
      if (missingCategoryNames.length > 0) {
        await this.categoryRepository
          .createQueryBuilder()
          .insert()
          .into(OrganisationCategory)
          .values(
            missingCategoryNames.map((name) => ({
              name,
              organisation: { id: organisationId },
            })),
          )
          .orIgnore()
          .execute();
      }

      // 5. Re-fetch all categories for updated mapping
      const allCategories = await this.categoryRepository.find({
        where: {
          organisation: { id: organisationId },
          name: In(categoryNames),
        },
      });
      allCategories.forEach((c) => {
        categoryMap.set(c.name, c);
      });

      // 6. Generate INV number
      const startingInvNumber =
        await this.productService.generateInvNumber(organisationId);
      const invNumberPrefix = startingInvNumber.split("-")[0];
      const startingNumber = parseInt(startingInvNumber.split("-")[1]);

      // 7. Validate and prepare products
      const batchSize = 100;
      const validProducts: Product[] = [];

      for (let i = 0; i < productsData.length; i++) {
        const productData = productsData[i];

        try {
          if (existingProductNames.has(productData.name)) {
            throw new Error(
              `Product with name "${productData.name}" already exists`,
            );
          }

          const category = categoryMap.get(productData.category);
          if (!category) {
            throw new Error(`Category "${productData.category}" not found`);
          }

          const product = this.productRepository.create({
            name: productData.name,
            description: productData.description,
            unitPrice: productData.unitPrice,
            currency: productData.currency || "NGN",
            stockQty: productData.stockQty,
            stockQtyAlert: productData.stockQtyAlert,
            unitOfMeasure: productData.unitOfMeasure,
            productCode: productData.productCode,
            image_url: productData.image_url,
            category: { id: category.id },
            organisation: { id: organisationId },
            inv_number: `${invNumberPrefix}-${(startingNumber + i).toString().padStart(3, "0")}`,
          });

          validProducts.push(product);
          result.successCount++;
        } catch (error) {
          result.failedCount++;
          result.failedRows.push({
            rowNumber: i + 1,
            data: productData,
            error: error.message,
          });
        }
      }

      // 8. Save products in batches
      if (validProducts.length) {
        for (let i = 0; i < validProducts.length; i += batchSize) {
          const batch = validProducts.slice(i, i + batchSize);
          await this.productRepository.save(batch);
        }
      }
    } catch (error) {
      this.logger.error(
        `Error in bulk creating products: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        `Failed to create products: ${error.message}`,
      );
    }

    // 9. Fetch user org info
    const userOrganisation =
      await this.userOrganisationRepository.findByUserAndOrganisation(
        userId,
        organisationId,
      );

    if (!userOrganisation) {
      this.logger.error(
        `User organisation not found for userId: ${userId}, organisationId: ${organisationId}`,
      );
      return;
    }

    // 10. Send email result
    await this.emailService.sendProductsBulkUploadResultEmail(
      userOrganisation.user.email,
      {
        organisationName: userOrganisation.organisation.name,
        result,
      },
    );
  }

  /**
   * Generate a sample CSV template for product upload
   */
  generateSampleTemplate(): Buffer {
    const sampleData = [
      {
        name: "Sample Product 1",
        description: "Product description here",
        unitPrice: 1000,
        currency: "NGN",
        stockQty: 50,
        stockQtyAlert: 10,
        unitOfMeasure: "pcs",
        category: "Electronics", // Replace with a valid category name
        productCode: "PROD-001",
        image_url: "https://example.com/image.jpg",
      },
      {
        name: "Sample Product 2",
        description: "Another product description",
        unitPrice: 2500,
        currency: "NGN",
        stockQty: 100,
        stockQtyAlert: 20,
        unitOfMeasure: "pcs",
        category: "Office Supplies", // Replace with a valid category name
        productCode: "PROD-002",
        image_url: "",
      },
    ];

    // Convert to CSV
    const csv = Papa.unparse(sampleData);
    return Buffer.from(csv);
  }
}
