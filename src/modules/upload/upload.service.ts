import { Injectable, InternalServerErrorException } from "@nestjs/common";

@Injectable()
export class UploadService {
  private readonly supabaseUrl = process.env.SUPABASE_URL!;
  private readonly serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  private readonly bucket = "chat-attachments";

  async uploadFile(
    file: Express.Multer.File,
    uploaderUserId: string,
  ): Promise<{
    url: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
  }> {
    const ext = file.originalname.split(".").pop() ?? "bin";
    // 충돌 방지를 위해 유저ID + 타임스탬프 + 랜덤 문자열로 경로 구성
    const key = `${uploaderUserId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const uploadUrl = `${this.supabaseUrl}/storage/v1/object/${this.bucket}/${key}`;

    const res = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.serviceRoleKey}`,
        "Content-Type": file.mimetype,
        "x-upsert": "true",
      },
      body: new Uint8Array(file.buffer),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new InternalServerErrorException(
        `Supabase Storage 업로드 실패: ${text}`,
      );
    }

    const publicUrl = `${this.supabaseUrl}/storage/v1/object/public/${this.bucket}/${key}`;
    return {
      url: publicUrl,
      fileName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
    };
  }
}
