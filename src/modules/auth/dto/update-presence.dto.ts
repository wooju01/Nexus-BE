import { IsEnum } from 'class-validator';
import { PresenceStatus } from '@prisma/client';  // Prisma가 생성한 enum 타입

export class UpdatePresenceDto {
  @IsEnum(PresenceStatus)  
  status!: PresenceStatus;
}
