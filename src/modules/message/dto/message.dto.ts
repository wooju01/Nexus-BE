export type AttachmentDto = {
  url: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  thumbnailUrl?: string;
};

export type SendMessageDto = {
  content: object; // Tiptap JSON
  parentId?: string;
  attachments?: AttachmentDto[];
};

export type UpdateMessageDto = {
  content: object;
};

export type AddReactionDto = {
  emoji: string;
};

export type ReadMarkerDto = {
  lastReadMessageId: string;
};

export type MessageQueryDto = {
  cursor?: string;
  limit?: number;
};
