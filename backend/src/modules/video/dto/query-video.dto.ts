import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto.js';

export class QueryVideoDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  keyword?: string;
}
