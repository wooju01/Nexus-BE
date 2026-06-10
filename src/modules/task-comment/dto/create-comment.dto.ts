import { IsNotEmpty } from "class-validator";

export class CreateCommentDto {
  /**
   * Tiptap JSON 또는 일반 객체/문자열.
   * 형식 검증은 FE 와의 계약에 맡기고, BE 는 그대로 저장.
   */
  @IsNotEmpty()
  content: unknown;
}
