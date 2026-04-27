import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";

import { AppModule } from "./app.module";

/**
 * Nexus Backend 부트스트랩.
 *
 * - 글로벌 prefix `/v1` (CLAUDE.md §11)
 * - CORS origin 은 환경변수 `CORS_ORIGIN` 에서 받음 (개발 기본: localhost:3001)
 *   prod/staging 환경에서 다른 도메인을 써야 하므로 하드코딩 금지.
 *   credentials 허용 — Authorization 헤더와 cookie 둘 다 지원하기 위함.
 * - 글로벌 ValidationPipe — DTO `class-validator` 자동 적용 + transform
 *
 * 글로벌 ExceptionFilter / Guard 는 AppModule 의 APP_FILTER / APP_GUARD
 * provider 로 등록한다 (DI 컨테이너 안에서 의존성 받기 위함).
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix("v1");

  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? "http://localhost:3001",
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true, // DTO 에 정의되지 않은 키는 제거
      forbidNonWhitelisted: false,
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
