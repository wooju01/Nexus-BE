import { IsString, IsOptional, IsUrl } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()  
  @IsString()
  name?: string;

  @IsOptional()
  @IsUrl()       
  avatar?: string;
}
