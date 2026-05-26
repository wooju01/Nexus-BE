import { Global, Module } from "@nestjs/common";

import { MailService } from "./mail.service";

/**
 * 메일 모듈 — Global 로 등록해서 다른 모듈이 imports 명시 없이도
 * MailService 를 inject 받을 수 있도록 한다.
 */
@Global()
@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
