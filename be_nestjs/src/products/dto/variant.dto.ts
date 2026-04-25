import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateVariantDto {
  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  size?: string;

  @IsOptional()
  @IsNumber()
  price_modifier?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stock_quantity?: number;
}