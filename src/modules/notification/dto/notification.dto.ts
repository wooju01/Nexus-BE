import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ListNotificationsDto {
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  unread?: boolean;

  @IsOptional()
  cursor?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  limit?: number = 20;
}

export class UpdateNotificationSettingsDto {
  @IsOptional()
  @IsBoolean()
  emailMention?: boolean;

  @IsOptional()
  @IsBoolean()
  emailDM?: boolean;

  @IsOptional()
  @IsBoolean()
  emailTaskAssigned?: boolean;

  @IsOptional()
  @IsBoolean()
  pushMention?: boolean;

  @IsOptional()
  @IsBoolean()
  pushDM?: boolean;

  @IsOptional()
  @IsBoolean()
  dndEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  dndStartHour?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  dndEndHour?: number;
}
