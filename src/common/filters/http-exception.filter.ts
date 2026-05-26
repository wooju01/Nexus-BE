import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { Request, Response } from "express";

/**
 * HTTP status → 응답 `error.code` 매핑.
 *
 * 키를 numeric literal 로 둔 이유: NestJS `HttpStatus` enum 과 number 를 직접
 * 비교/스위칭하면 ESLint `no-unsafe-enum-comparison` 룰에 걸린다.
 * HTTP 상태 코드 자체가 표준 숫자이므로 리터럴이 가독성에도 충분하다.
 */
const HTTP_STATUS_TO_CODE: Record<number, string> = {
  400: "BAD_REQUEST",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  422: "UNPROCESSABLE_ENTITY",
  429: "TOO_MANY_REQUESTS",
};

/**
 * 모든 예외를 CLAUDE.md §11 의 통일 응답 셰이프로 변환:
 *
 *   { "error": { "code": "TASK_NOT_FOUND", "message": "...", "details": {} } }
 *
 * - `HttpException` 은 status 와 메시지를 그대로 활용
 * - 그 외(예상 못 한 런타임 에러)는 500 + INTERNAL_ERROR 로 마스킹 (스택은 로그로만)
 * - `class-validator` 검증 실패는 400 + VALIDATION_ERROR + details.errors[]
 */

type ErrorBody = {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, body } = this.toErrorResponse(exception);

    // 5xx 는 원인 추적이 중요하므로 스택을 로그로 남긴다.
    if (status >= 500) {
      this.logger.error(
        `[${request.method} ${request.url}] ${body.error.code} — ${body.error.message}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json(body);
  }

  private toErrorResponse(exception: unknown): {
    status: number;
    body: ErrorBody;
  } {
    if (exception instanceof HttpException) {
      return this.fromHttpException(exception);
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        error: {
          code: "INTERNAL_ERROR",
          message: "서버에서 예상치 못한 오류가 발생했습니다.",
        },
      },
    };
  }

  private fromHttpException(exception: HttpException): {
    status: number;
    body: ErrorBody;
  } {
    const status = exception.getStatus();
    const raw = exception.getResponse();

    // class-validator 가 던지는 BadRequestException 의 형태:
    //   { statusCode: 400, message: string[], error: 'Bad Request' }
    if (
      status === 400 &&
      typeof raw === "object" &&
      raw !== null &&
      Array.isArray((raw as { message?: unknown }).message)
    ) {
      const errors = (raw as { message: string[] }).message;
      return {
        status,
        body: {
          error: {
            code: "VALIDATION_ERROR",
            message: "요청 본문 검증에 실패했습니다.",
            details: { errors },
          },
        },
      };
    }

    const message =
      typeof raw === "string"
        ? raw
        : typeof (raw as { message?: unknown }).message === "string"
          ? (raw as { message: string }).message
          : exception.message;

    return {
      status,
      body: {
        error: {
          code: this.statusToCode(status),
          message,
        },
      },
    };
  }

  private statusToCode(status: number): string {
    return (
      HTTP_STATUS_TO_CODE[status] ??
      (status >= 500 ? "INTERNAL_ERROR" : "HTTP_ERROR")
    );
  }
}
