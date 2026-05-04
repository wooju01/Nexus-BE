import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import * as nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

import { renderInvitationEmail } from "./templates/invitation.template";

/**
 * SMTP 발송 서비스 (Nodemailer 래퍼).
 *
 * 환경변수:
 *   SMTP_HOST       — 예: smtp.gmail.com / sandbox.smtp.mailtrap.io
 *   SMTP_PORT       — 예: 587 (STARTTLS) / 465 (SMTPS) / 2525 (Mailtrap)
 *   SMTP_USER       — 인증 username
 *   SMTP_PASS       — 인증 password (Gmail 은 앱 비밀번호 사용)
 *   SMTP_FROM       — 발신자 표기, 예: "Nexus <noreply@nexus.app>"
 *   APP_BASE_URL    — FE 도메인 (메일 본문의 초대 링크 origin)
 *
 * 운영 정책:
 *   - SMTP_HOST 가 비어있으면 dev 모드로 간주 — 메일 발송 시도 안 하고 로그만 찍음.
 *     (로컬에서 SMTP 설정 안 해도 invitation API 자체는 동작하도록.)
 *   - 발송 실패는 throw 하지 않고 false 반환 — invitation 생성 성공 자체를 막지 않기 위해.
 */
@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;
  private fromAddress = "Nexus <noreply@nexus.local>";

  onModuleInit() {
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT
      ? Number.parseInt(process.env.SMTP_PORT, 10)
      : 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    if (process.env.SMTP_FROM) this.fromAddress = process.env.SMTP_FROM;

    if (!host) {
      this.logger.warn(
        "SMTP_HOST 가 설정되지 않았습니다. 메일 발송은 비활성 상태로 동작합니다 (dev fallback).",
      );
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      // 465 → SMTPS (secure), 그 외 → STARTTLS
      secure: port === 465,
      auth: user && pass ? { user, pass } : undefined,
    });

    this.logger.log(`SMTP transporter 준비 완료 (${host}:${port})`);
  }

  /**
   * 워크스페이스 초대 메일 발송.
   * 성공 여부 boolean 반환. 발송 실패 시에도 throw 하지 않음.
   */
  async sendInvitation(params: {
    to: string;
    workspaceName: string;
    inviterName: string;
    role: "ADMIN" | "MEMBER";
    token: string;
    expiresAt: Date;
  }): Promise<boolean> {
    const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
    const acceptUrl = `${baseUrl.replace(/\/$/, "")}/invite/${params.token}`;

    const { html, text, subject } = renderInvitationEmail({
      ...params,
      acceptUrl,
    });

    if (!this.transporter) {
      this.logger.warn(
        `[mail-disabled] to=${params.to} subject="${subject}" link=${acceptUrl}`,
      );
      return false;
    }

    try {
      const info = await this.transporter.sendMail({
        from: this.fromAddress,
        to: params.to,
        subject,
        text,
        html,
      });
      this.logger.log(
        `초대 메일 발송 완료 — to=${params.to} id=${info.messageId}`,
      );
      return true;
    } catch (err) {
      // SMTP 장애가 invitation 생성 자체를 막지 않도록 throw 대신 false.
      this.logger.error(
        `초대 메일 발송 실패 — to=${params.to}: ${err instanceof Error ? err.message : String(err)}`,
      );
      return false;
    }
  }
}
