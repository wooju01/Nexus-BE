import { IsString, IsOptional, IsUrl, Matches, MaxLength } from "class-validator";

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @Matches(/^[a-z0-9._]{3,20}$/, {
    message:
      "username은 소문자·숫자·점·언더스코어만 사용 가능하며 3~20자여야 합니다.",
  })
  username?: string;

  @IsOptional()
  @IsUrl()
  avatar?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  jobTitle?: string;
}
