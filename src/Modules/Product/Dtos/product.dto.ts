import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  ValidateIf,
  IsUUID,
} from "class-validator";

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  unitPrice: number;

  @IsString()
  currency: string;

  @IsNumber()
  stockQty: number;

  @IsNumber()
  @IsOptional()
  stockQtyAlert: number;

  @IsUUID()
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

  @IsOptional()
  unitPrice?: number;

  @IsString()
  @IsOptional()
  currency: string;

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

  @IsUUID()
  @IsOptional()
  category: string;
}
