import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Req,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import type { Request } from "express";
import { UploadService } from "./upload.service";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

@Controller("upload")
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith("image/")) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException("이미지 파일만 업로드 가능합니다."),
            false,
          );
        }
      },
    }),
  )
  async upload(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    if (!file) throw new BadRequestException("파일이 없습니다.");
    const { userId } = req.user as { userId: string };
    return this.uploadService.uploadFile(file, userId);
  }
}
