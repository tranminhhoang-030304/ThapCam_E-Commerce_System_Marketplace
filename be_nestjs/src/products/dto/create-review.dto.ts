import { IsUUID, IsInt, Min, Max, IsString, IsOptional } from 'class-validator';

export class CreateReviewDto {
  @IsUUID()
  productId: string;

  @IsInt()
  @Min(1, { message: 'Đánh giá thấp nhất là 1 sao' })
  @Max(5, { message: 'Đánh giá cao nhất là 5 sao' })
  rating: number;

  @IsString()
  @IsOptional()
  comment?: string;
}