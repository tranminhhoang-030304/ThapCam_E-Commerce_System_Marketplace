import { IsString, IsNumber, IsOptional, IsEnum, Min } from 'class-validator';

export class CreateProductDto {
  @IsOptional()
  @IsString()
  sku?: string;

  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsNumber()
  @Min(0)
  stock_quantity: number;

  @IsOptional()
  @IsString()
  image_url?: string;

  @IsOptional()
  @IsEnum(['active', 'hidden', 'draft'])
  status?: string;

  @IsOptional()
  @IsString()
  categoryId?: string; 
}