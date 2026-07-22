import {
  Controller,
  Post,
  Patch,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { SignupDto } from "./dto/signup.dto";
import { LoginDto } from "./dto/login.dto";
import { RefreshDto } from "./dto/refresh.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { UpdatePresenceDto } from "./dto/update-presence.dto";
import { Public } from "../../common/decorators/public.decorator";
import { ChangePasswordDto } from "./dto/change-password.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("signup")
  async signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() req: Request) {
    const user = req.user as { userId: string };
    await this.authService.logout(user.userId);
  }

  @Public()
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Public()
  @Get("google")
  @UseGuards(AuthGuard("google"))
  async googleAuth() {}

  @Public()
  @Get("google/callback")
  @UseGuards(AuthGuard("google"))
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const tokens = await this.authService.socialLogin(req.user as any);
    const frontendUrl = process.env.CORS_ORIGIN ?? "http://localhost:3000";
    res.redirect(
      `${frontendUrl}/auth/callback?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`,
    );
  }

  @Public()
  @Get("kakao")
  @UseGuards(AuthGuard("kakao"))
  async kakaoAuth() {}

  @Public()
  @Get("kakao/callback")
  @UseGuards(AuthGuard("kakao"))
  async kakaoCallback(@Req() req: Request, @Res() res: Response) {
    console.log(`[KakaoCallback] user=${JSON.stringify(req.user)}`);
    try {
      const tokens = await this.authService.socialLogin(req.user as any);
      const frontendUrl = process.env.CORS_ORIGIN ?? "http://localhost:3000";
      console.log(`[KakaoCallback] redirecting to ${frontendUrl}/auth/callback`);
      res.redirect(
        `${frontendUrl}/auth/callback?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`,
      );
    } catch (e) {
      console.error(`[KakaoCallback] socialLogin error:`, e);
      throw e;
    }
  }

  @Get("profile")
  async getProfile(@Req() req: Request) {
    const user = req.user as { userId: string };
    return this.authService.getProfile(user.userId);
  }

  @Patch("profile")
  async updateProfile(@Req() req: Request, @Body() dto: UpdateProfileDto) {
    const user = req.user as { userId: string };
    return this.authService.updateProfile(user.userId, dto);
  }

  @Patch("profile/presence")
  @HttpCode(HttpStatus.OK)
  async updatePresence(@Req() req: Request, @Body() dto: UpdatePresenceDto) {
    const user = req.user as { userId: string };
    return this.authService.updatePresence(user.userId, dto.status);
  }

  @Patch("password")
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(@Req() req: Request, @Body() dto: ChangePasswordDto) {
    const user = req.user as { userId: string };
    await this.authService.changePassword(user.userId, dto);
  }
}
