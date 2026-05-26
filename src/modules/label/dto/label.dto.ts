export type CreateLabelDto = {
  name: string;
  color: string;
  description?: string;
};

export type UpdateLabelDto = {
  name?: string;
  color?: string;
  description?: string;
};
