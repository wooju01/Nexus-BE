export type SendMessageDto = {
  content: object; // Tiptap JSON
  parentId?: string;
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
