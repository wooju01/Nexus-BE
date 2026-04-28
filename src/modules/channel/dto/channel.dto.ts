export type CreateChannelDto = {
  name: string;
  topic?: string;
  isPrivate?: boolean;
};

export type UpdateChannelDto = {
  name?: string;
  topic?: string;
  isPrivate?: boolean;
};
