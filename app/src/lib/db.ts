import Dexie, { type EntityTable } from "dexie";

// ===== Types =====
export type PromptType = "image" | "video" | "chatbot" | "workflow";
export type WorkflowType = "comfyui" | "automatic1111" | "flux" | "other";

export interface Prompt {
  id: string;
  title: string;
  content: string;
  negativePrompt: string;
  type: PromptType;
  model: string;
  lora: string;
  seed: string;
  sampler: string;
  cfgScale: number;
  steps: number;
  creator: string;
  tags: string[];
  notes: string;
  isFavorite: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ImageRecord {
  id: string;
  title: string;
  imageData: Blob;
  thumbnailData: Blob | null;
  promptId: string | null;
  prompt: string;
  negativePrompt: string;
  model: string;
  lora: string;
  seed: string;
  sampler: string;
  cfgScale: number;
  steps: number;
  creator: string;
  note: string;
  width: number;
  height: number;
  fileSize: number;
  format: string;
  tags: string[];
  isFavorite: boolean;
  createdAt: Date;
}

export interface Comment {
  id: string;
  imageId: string;
  content: string;
  createdAt: Date;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Workflow {
  id: string;
  title: string;
  description: string;
  content: string;
  type: WorkflowType;
  creator: string;
  tags: string[];
  isFavorite: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ===== Database =====
class PromptVaultDB extends Dexie {
  prompts!: EntityTable<Prompt, "id">;
  images!: EntityTable<ImageRecord, "id">;
  comments!: EntityTable<Comment, "id">;
  tags!: EntityTable<Tag, "id">;
  workflows!: EntityTable<Workflow, "id">;

  constructor() {
    super("PromptVaultDB");

    this.version(1).stores({
      prompts: "id, title, type, creator, *tags, createdAt, updatedAt",
      images: "id, title, promptId, creator, *tags, createdAt",
      comments: "id, imageId, createdAt",
      tags: "id, &name",
      workflows: "id, title, type, creator, *tags, createdAt",
    });
  }
}

export const db = new PromptVaultDB();

// ===== CRUD Operations =====

// -- Prompts --
export const createPrompt = async (
  data: Omit<Prompt, "id" | "createdAt" | "updatedAt">,
): Promise<string> => {
  const id = crypto.randomUUID();
  const now = new Date();
  await db.prompts.add({ ...data, id, createdAt: now, updatedAt: now });
  return id;
};

export const updatePrompt = async (
  id: string,
  data: Partial<Prompt>,
): Promise<void> => {
  await db.prompts.update(id, { ...data, updatedAt: new Date() });
};

export const deletePrompt = async (id: string): Promise<void> => {
  await db.prompts.delete(id);
};

export const getAllPrompts = async (): Promise<Prompt[]> => {
  return db.prompts.orderBy("createdAt").reverse().toArray();
};

export const getPromptsByType = async (type: PromptType): Promise<Prompt[]> => {
  return db.prompts.where("type").equals(type).reverse().sortBy("createdAt");
};

// -- Images --
export const createImage = async (
  data: Omit<ImageRecord, "id" | "createdAt">,
): Promise<string> => {
  const id = crypto.randomUUID();
  await db.images.add({ ...data, id, createdAt: new Date() });
  return id;
};

export const updateImage = async (
  id: string,
  data: Partial<ImageRecord>,
): Promise<void> => {
  await db.images.update(id, data);
};

export const deleteImage = async (id: string): Promise<void> => {
  await db.images.delete(id);
  // Xóa comments liên quan
  await db.comments.where("imageId").equals(id).delete();
};

export const getAllImages = async (): Promise<ImageRecord[]> => {
  return db.images.orderBy("createdAt").reverse().toArray();
};

// -- Comments --
export const createComment = async (
  imageId: string,
  content: string,
): Promise<string> => {
  const id = crypto.randomUUID();
  await db.comments.add({ id, imageId, content, createdAt: new Date() });
  return id;
};

export const getCommentsByImage = async (
  imageId: string,
): Promise<Comment[]> => {
  return db.comments.where("imageId").equals(imageId).sortBy("createdAt");
};

export const deleteComment = async (id: string): Promise<void> => {
  await db.comments.delete(id);
};

// -- Tags --
export const createTag = async (
  name: string,
  color: string = "#8b5cf6",
): Promise<string> => {
  const id = crypto.randomUUID();
  await db.tags.add({ id, name, color });
  return id;
};

export const getAllTags = async (): Promise<Tag[]> => {
  return db.tags.orderBy("name").toArray();
};

export const deleteTag = async (id: string): Promise<void> => {
  await db.tags.delete(id);
};

// -- Workflows --
export const createWorkflow = async (
  data: Omit<Workflow, "id" | "createdAt" | "updatedAt">,
): Promise<string> => {
  const id = crypto.randomUUID();
  const now = new Date();
  await db.workflows.add({ ...data, id, createdAt: now, updatedAt: now });
  return id;
};

export const getAllWorkflows = async (): Promise<Workflow[]> => {
  return db.workflows.orderBy("createdAt").reverse().toArray();
};

export const deleteWorkflow = async (id: string): Promise<void> => {
  await db.workflows.delete(id);
};

// -- Stats --
export const getStats = async () => {
  const [promptCount, imageCount, workflowCount, tagCount] = await Promise.all([
    db.prompts.count(),
    db.images.count(),
    db.workflows.count(),
    db.tags.count(),
  ]);
  return { promptCount, imageCount, workflowCount, tagCount };
};
