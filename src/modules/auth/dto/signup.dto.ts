import { IsEmail, IsString, Matches, MinLength } from "class-validator";

export class SignupDto {
  @IsEmail()
  email!: string;

  @IsString()
  name!: string;

  @IsString()
  @Matches(/^[a-z0-9._]{3,20}$/, {
    message:
      "username은 소문자·숫자·점·언더스코어만 사용 가능하며 3~20자여야 합니다.",
  })
  username!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
