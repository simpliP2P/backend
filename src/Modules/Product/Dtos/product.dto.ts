import { IsString, IsNotEmpty, IsOptional, IsDecimal, IsNumber, ValidateIf } from "class-validator";

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  unitPrice: number;

  @IsNumber()
  stockQty: number;

  @IsNumber()
  @IsOptional()
  stockQtyAlert : number;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsString()
  @IsOptional()
  productCode?: string;

  @IsString()
  @IsOptional()
  image_url: string;
}

export class UpdateProductDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDecimal()
  @IsOptional()
  unitPrice?: number;

  @IsString()
  @IsOptional()
  productCode?: string;

  @IsNumber()
  @IsOptional()
  stockQty?: number;

  @ValidateIf((dto) => dto.stockQty !== undefined)
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    {
      message: "stockQtyAlert is required when stockQty is provided",
    },
  )
  stockQtyAlert?: number;

  @IsString()
  @IsOptional()
  category: string;
}
