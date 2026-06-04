import { supabase } from "./supabaseClient";

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
  user_id?: string;
}

export interface ImageRecord {
  id: string;
  title: string;
  imageData: Blob | string; // Supabase stores the image URL (string) here
  thumbnailData: Blob | string | null; // Supabase stores the thumbnail URL (string) here
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
  user_id?: string;
}

export interface Comment {
  id: string;
  imageId: string;
  content: string;
  createdAt: Date;
  user_id?: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  user_id?: string;
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
  user_id?: string;
}

// Helper to check if a value is a Blob
const isBlob = (val: any): val is Blob => val instanceof Blob;

// Helper to get logged-in User ID
const getUserId = async (): Promise<string | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
};

// ===== Supabase Compat Layer (Mirrors Dexie API structure with Multi-user Security) =====
export const db = {
  prompts: {
    count: async (): Promise<number> => {
      const userId = await getUserId();
      if (!userId) return 0;
      const { count, error } = await supabase
        .from("prompts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);
      if (error) console.error("Error prompts.count:", error);
      return count || 0;
    },
    toArray: async (): Promise<Prompt[]> => {
      const userId = await getUserId();
      if (!userId) return [];
      const { data, error } = await supabase
        .from("prompts")
        .select("*")
        .eq("user_id", userId)
        .order("createdAt", { ascending: false });
      if (error) throw error;
      return (data || [])
        .filter(row => {
          const isDriveSyncVideo = row.type === "video" && (
            row.tags?.includes("DriveSync") ||
            row.tags?.includes("SnapSave") ||
            row.notes?.includes("videoMetadata")
          );
          return !isDriveSyncVideo;
        })
        .map(row => ({
          ...row,
          createdAt: new Date(row.createdAt),
          updatedAt: new Date(row.updatedAt)
        }));
    },
    orderBy: (field: string) => {
      return {
        reverse: () => {
          return {
            toArray: async (): Promise<Prompt[]> => {
              const userId = await getUserId();
              if (!userId) return [];
              const { data, error } = await supabase
                .from("prompts")
                .select("*")
                .eq("user_id", userId)
                .order(field === "createdAt" ? "createdAt" : field, { ascending: false });
              if (error) throw error;
              return (data || [])
                .filter(row => {
                  const isDriveSyncVideo = row.type === "video" && (
                    row.tags?.includes("DriveSync") ||
                    row.tags?.includes("SnapSave") ||
                    row.notes?.includes("videoMetadata")
                  );
                  return !isDriveSyncVideo;
                })
                .map(row => ({
                  ...row,
                  createdAt: new Date(row.createdAt),
                  updatedAt: new Date(row.updatedAt)
                }));
            }
          };
        }
      };
    },
    where: (field: string) => {
      return {
        equals: (val: any) => {
          return {
            reverse: () => {
              return {
                sortBy: async (sortField: string): Promise<Prompt[]> => {
                  const userId = await getUserId();
                  if (!userId) return [];
                  const { data, error } = await supabase
                    .from("prompts")
                    .select("*")
                    .eq("user_id", userId)
                    .eq(field, val)
                    .order(sortField, { ascending: false });
                  if (error) throw error;
                  return (data || []).map(row => ({
                    ...row,
                    createdAt: new Date(row.createdAt),
                    updatedAt: new Date(row.updatedAt)
                  }));
                }
              };
            }
          };
        }
      };
    },
    get: async (id: string): Promise<Prompt | null> => {
      const userId = await getUserId();
      if (!userId) return null;
      const { data, error } = await supabase
        .from("prompts")
        .select("*")
        .eq("user_id", userId)
        .eq("id", id)
        .maybeSingle();
      if (error || !data) return null;
      return {
        ...data,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt)
      };
    },
    update: async (id: string, updates: Partial<Prompt>): Promise<void> => {
      const userId = await getUserId();
      if (!userId) return;
      const { error } = await supabase
        .from("prompts")
        .update({
          ...updates,
          updatedAt: new Date().toISOString()
        })
        .eq("user_id", userId)
        .eq("id", id);
      if (error) throw error;
    },
    clear: async (): Promise<void> => {
      const userId = await getUserId();
      if (!userId) return;
      const { error } = await supabase
        .from("prompts")
        .delete()
        .eq("user_id", userId)
        .neq("id", "");
      if (error) throw error;
    },
    filter: (fn: (item: Prompt) => boolean) => {
      return {
        toArray: async (): Promise<Prompt[]> => {
          const all = await db.prompts.toArray();
          return all.filter(fn);
        }
      };
    }
  },
  images: {
    count: async (): Promise<number> => {
      const userId = await getUserId();
      if (!userId) return 0;
      const { count, error } = await supabase
        .from("images")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);
      if (error) console.error("Error images.count:", error);
      return count || 0;
    },
    toArray: async (): Promise<ImageRecord[]> => {
      return getAllImages();
    },
    orderBy: (field: string) => {
      return {
        reverse: () => {
          return {
            limit: (n: number) => {
              return {
                toArray: async (): Promise<ImageRecord[]> => {
                  const userId = await getUserId();
                  if (!userId) return [];
                  const { data, error } = await supabase
                    .from("images")
                    .select("*")
                    .eq("user_id", userId)
                    .order(field === "createdAt" ? "createdAt" : field, { ascending: false })
                    .limit(n);
                  if (error) throw error;
                  return (data || []).map(row => ({
                    id: row.id,
                    title: row.title,
                    imageData: row.imageUrl,
                    thumbnailData: row.thumbnailUrl,
                    promptId: row.promptId,
                    prompt: row.prompt || "",
                    negativePrompt: row.negativePrompt || "",
                    model: row.model || "",
                    lora: row.lora || "",
                    seed: row.seed || "",
                    sampler: row.sampler || "",
                    cfgScale: Number(row.cfgScale),
                    steps: row.steps || 0,
                    creator: row.creator || "",
                    note: row.note || "",
                    width: row.width || 0,
                    height: row.height || 0,
                    fileSize: row.fileSize || 0,
                    format: row.format || "png",
                    tags: row.tags || [],
                    isFavorite: row.isFavorite || false,
                    createdAt: new Date(row.createdAt),
                  }));
                }
              };
            },
            toArray: async (): Promise<ImageRecord[]> => {
              const userId = await getUserId();
              if (!userId) return [];
              const { data, error } = await supabase
                .from("images")
                .select("*")
                .eq("user_id", userId)
                .order(field === "createdAt" ? "createdAt" : field, { ascending: false });
              if (error) throw error;
              return (data || []).map(row => ({
                id: row.id,
                title: row.title,
                imageData: row.imageUrl,
                thumbnailData: row.thumbnailUrl,
                promptId: row.promptId,
                prompt: row.prompt || "",
                negativePrompt: row.negativePrompt || "",
                model: row.model || "",
                lora: row.lora || "",
                seed: row.seed || "",
                sampler: row.sampler || "",
                cfgScale: Number(row.cfgScale),
                steps: row.steps || 0,
                creator: row.creator || "",
                note: row.note || "",
                width: row.width || 0,
                height: row.height || 0,
                fileSize: row.fileSize || 0,
                format: row.format || "png",
                tags: row.tags || [],
                isFavorite: row.isFavorite || false,
                createdAt: new Date(row.createdAt),
              }));
            }
          };
        }
      };
    },
    get: async (id: string): Promise<ImageRecord | null> => {
      const userId = await getUserId();
      if (!userId) return null;
      const { data, error } = await supabase
        .from("images")
        .select("*")
        .eq("user_id", userId)
        .eq("id", id)
        .maybeSingle();
      if (error || !data) return null;
      return {
        id: data.id,
        title: data.title,
        imageData: data.imageUrl,
        thumbnailData: data.thumbnailUrl,
        promptId: data.promptId,
        prompt: data.prompt || "",
        negativePrompt: data.negativePrompt || "",
        model: data.model || "",
        lora: data.lora || "",
        seed: data.seed || "",
        sampler: data.sampler || "",
        cfgScale: Number(data.cfgScale),
        steps: data.steps || 0,
        creator: data.creator || "",
        note: data.note || "",
        width: data.width || 0,
        height: data.height || 0,
        fileSize: data.fileSize || 0,
        format: data.format || "png",
        tags: data.tags || [],
        isFavorite: data.isFavorite || false,
        createdAt: new Date(data.createdAt),
      };
    },
    update: async (id: string, updates: Partial<ImageRecord>): Promise<void> => {
      const userId = await getUserId();
      if (!userId) return;
      const { error } = await supabase
        .from("images")
        .update(updates)
        .eq("user_id", userId)
        .eq("id", id);
      if (error) throw error;
    },
    clear: async (): Promise<void> => {
      const userId = await getUserId();
      if (!userId) return;
      const { error } = await supabase
        .from("images")
        .delete()
        .eq("user_id", userId)
        .neq("id", "");
      if (error) throw error;
    },
    filter: (fn: (item: ImageRecord) => boolean) => {
      return {
        toArray: async (): Promise<ImageRecord[]> => {
          const all = await db.images.toArray();
          return all.filter(fn);
        }
      };
    }
  },
  workflows: {
    count: async (): Promise<number> => {
      const userId = await getUserId();
      if (!userId) return 0;
      const { count, error } = await supabase
        .from("workflows")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);
      if (error) console.error("Error workflows.count:", error);
      return count || 0;
    },
    toArray: async (): Promise<Workflow[]> => {
      const userId = await getUserId();
      if (!userId) return [];
      const { data, error } = await supabase
        .from("workflows")
        .select("*")
        .eq("user_id", userId)
        .order("createdAt", { ascending: false });
      if (error) throw error;
      return (data || []).map(row => ({
        ...row,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt)
      }));
    },
    orderBy: (field: string) => {
      return {
        reverse: () => {
          return {
            toArray: async (): Promise<Workflow[]> => {
              const userId = await getUserId();
              if (!userId) return [];
              const { data, error } = await supabase
                .from("workflows")
                .select("*")
                .eq("user_id", userId)
                .order(field === "createdAt" ? "createdAt" : field, { ascending: false });
              if (error) throw error;
              return (data || []).map(row => ({
                ...row,
                createdAt: new Date(row.createdAt),
                updatedAt: new Date(row.updatedAt)
              }));
            }
          };
        }
      };
    },
    clear: async (): Promise<void> => {
      const userId = await getUserId();
      if (!userId) return;
      const { error } = await supabase
        .from("workflows")
        .delete()
        .eq("user_id", userId)
        .neq("id", "");
      if (error) throw error;
    }
  },
  tags: {
    count: async (): Promise<number> => {
      const userId = await getUserId();
      if (!userId) return 0;
      const { count, error } = await supabase
        .from("tags")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);
      if (error) console.error("Error tags.count:", error);
      return count || 0;
    },
    toArray: async (): Promise<Tag[]> => {
      const userId = await getUserId();
      if (!userId) return [];
      const { data, error } = await supabase
        .from("tags")
        .select("*")
        .eq("user_id", userId)
        .order("name", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    clear: async (): Promise<void> => {
      const userId = await getUserId();
      if (!userId) return;
      const { error } = await supabase
        .from("tags")
        .delete()
        .eq("user_id", userId)
        .neq("id", "");
      if (error) throw error;
    }
  },
  comments: {
    count: async (): Promise<number> => {
      const userId = await getUserId();
      if (!userId) return 0;
      const { count, error } = await supabase
        .from("comments")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);
      if (error) console.error("Error comments.count:", error);
      return count || 0;
    },
    toArray: async (): Promise<Comment[]> => {
      const userId = await getUserId();
      if (!userId) return [];
      const { data, error } = await supabase
        .from("comments")
        .select("*")
        .eq("user_id", userId)
        .order("createdAt", { ascending: true });
      if (error) throw error;
      return (data || []).map(row => ({ ...row, createdAt: new Date(row.createdAt) }));
    },
    where: (field: string) => {
      return {
        equals: (val: any) => {
          return {
            sortBy: async (sortField: string): Promise<Comment[]> => {
              const userId = await getUserId();
              if (!userId) return [];
              const { data, error } = await supabase
                .from("comments")
                .select("*")
                .eq("user_id", userId)
                .eq(field, val)
                .order(sortField, { ascending: true });
              if (error) throw error;
              return (data || []).map(row => ({ ...row, createdAt: new Date(row.createdAt) }));
            },
            delete: async (): Promise<void> => {
              const userId = await getUserId();
              if (!userId) return;
              const { error } = await supabase
                .from("comments")
                .delete()
                .eq("user_id", userId)
                .eq(field, val);
              if (error) throw error;
            }
          };
        }
      };
    },
    clear: async (): Promise<void> => {
      const userId = await getUserId();
      if (!userId) return;
      const { error } = await supabase
        .from("comments")
        .delete()
        .eq("user_id", userId)
        .neq("id", "");
      if (error) throw error;
    }
  }
};

// ===== CRUD Operations =====

// -- Prompts --
export const createPrompt = async (
  data: Omit<Prompt, "id" | "createdAt" | "updatedAt">,
): Promise<string> => {
  const userId = await getUserId();
  if (!userId) throw new Error("Chưa đăng nhập");

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const { error } = await supabase.from("prompts").insert({
    id,
    title: data.title,
    content: data.content,
    negativePrompt: data.negativePrompt,
    type: data.type,
    model: data.model,
    lora: data.lora,
    seed: data.seed,
    sampler: data.sampler,
    cfgScale: data.cfgScale,
    steps: data.steps,
    creator: data.creator,
    tags: data.tags,
    notes: data.notes,
    isFavorite: data.isFavorite,
    createdAt: now,
    updatedAt: now,
    user_id: userId,
  });
  if (error) throw error;
  return id;
};

export const updatePrompt = async (
  id: string,
  data: Partial<Prompt>,
): Promise<void> => {
  const userId = await getUserId();
  if (!userId) return;

  const { error } = await supabase
    .from("prompts")
    .update({
      ...data,
      updatedAt: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("id", id);
  if (error) throw error;
};

export const deletePrompt = async (id: string): Promise<void> => {
  const userId = await getUserId();
  if (!userId) return;

  // Lấy thông tin prompt để kiểm tra xem có phải video không
  const { data, error: fetchError } = await supabase
    .from("prompts")
    .select("type")
    .eq("user_id", userId)
    .eq("id", id);

  const prompt = data && data.length > 0 ? data[0] : null;

  if (!fetchError && prompt && prompt.type === "video") {
    // Nếu là video, gọi API Route để xử lý xóa trên Cloudinary + Database
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const res = await fetch("/api/video/delete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ id }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || "Không thể xóa video qua API.");
    }
  } else {
    // Nếu không phải video, thực hiện xóa trực tiếp trong Database từ Client
    const { error } = await supabase
      .from("prompts")
      .delete()
      .eq("user_id", userId)
      .eq("id", id);
    if (error) throw error;
  }
};

export const getAllPrompts = async (): Promise<Prompt[]> => {
  const userId = await getUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from("prompts")
    .select("*")
    .eq("user_id", userId)
    .order("createdAt", { ascending: false });
  if (error) throw error;
  return (data || []).map(row => ({
    ...row,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt)
  }));
};

export const getPromptsByType = async (type: PromptType): Promise<Prompt[]> => {
  const userId = await getUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from("prompts")
    .select("*")
    .eq("user_id", userId)
    .eq("type", type)
    .order("createdAt", { ascending: false });
  if (error) throw error;
  return (data || []).map(row => ({
    ...row,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt)
  }));
};

// -- Images --
export const createImage = async (
  data: Omit<ImageRecord, "id" | "createdAt">,
): Promise<string> => {
  const userId = await getUserId();
  if (!userId) throw new Error("Chưa đăng nhập");

  const id = crypto.randomUUID();
  let imageUrl = "";
  let thumbnailUrl: string | null = null;
  const fileExtension = data.format || "png";

  // Upload image to Supabase Storage if it's a Blob
  if (isBlob(data.imageData)) {
    const imageFileName = `${userId}/${id}.${fileExtension}`; // Multi-user Storage folder!
    const { error: uploadError } = await supabase.storage
      .from("images")
      .upload(imageFileName, data.imageData, {
        contentType: `image/${fileExtension}`,
        upsert: true,
      });
    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from("images")
      .getPublicUrl(imageFileName);
    imageUrl = urlData.publicUrl;
  } else if (typeof data.imageData === "string") {
    imageUrl = data.imageData;
  }

  // Upload thumbnail if it's a Blob
  if (data.thumbnailData && isBlob(data.thumbnailData)) {
    const thumbFileName = `${userId}/thumbs/${id}.${fileExtension}`; // Multi-user Storage folder!
    const { error: thumbUploadError } = await supabase.storage
      .from("images")
      .upload(thumbFileName, data.thumbnailData, {
        contentType: `image/${fileExtension}`,
        upsert: true,
      });
    if (!thumbUploadError) {
      const { data: thumbUrlData } = supabase.storage
        .from("images")
        .getPublicUrl(thumbFileName);
      thumbnailUrl = thumbUrlData.publicUrl;
    }
  } else if (typeof data.thumbnailData === "string") {
    thumbnailUrl = data.thumbnailData;
  }

  const { error } = await supabase.from("images").insert({
    id,
    title: data.title,
    imageUrl,
    thumbnailUrl,
    promptId: data.promptId,
    prompt: data.prompt,
    negativePrompt: data.negativePrompt,
    model: data.model,
    lora: data.lora,
    seed: data.seed,
    sampler: data.sampler,
    cfgScale: data.cfgScale,
    steps: data.steps,
    creator: data.creator,
    note: data.note,
    width: data.width,
    height: data.height,
    fileSize: data.fileSize,
    format: data.format,
    tags: data.tags,
    isFavorite: data.isFavorite,
    createdAt: new Date().toISOString(),
    user_id: userId,
  });

  if (error) throw error;
  return id;
};

export const updateImage = async (
  id: string,
  data: Partial<ImageRecord>,
): Promise<void> => {
  const userId = await getUserId();
  if (!userId) return;

  const dbUpdates: any = { ...data };
  delete dbUpdates.imageData;
  delete dbUpdates.thumbnailData;

  const { error } = await supabase
    .from("images")
    .update(dbUpdates)
    .eq("user_id", userId)
    .eq("id", id);
  if (error) throw error;
};

export const deleteImage = async (id: string): Promise<void> => {
  const userId = await getUserId();
  if (!userId) return;

  // Get image record first to know file extension
  const { data: image } = await supabase
    .from("images")
    .select("format")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();
  const format = image?.format || "png";

  // Delete from database (comments will cascade delete in DB constraint)
  const { error } = await supabase
    .from("images")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);
  if (error) throw error;

  // Delete from Storage in background
  try {
    const fileNames = [`${userId}/${id}.${format}`, `${userId}/thumbs/${id}.${format}`];
    await supabase.storage.from("images").remove(fileNames);
  } catch (err) {
    console.error("Failed to delete storage files:", err);
  }
};

export const getAllImages = async (): Promise<ImageRecord[]> => {
  const userId = await getUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from("images")
    .select("*")
    .eq("user_id", userId)
    .order("createdAt", { ascending: false });
  if (error) throw error;
  return (data || []).map(row => ({
    id: row.id,
    title: row.title,
    imageData: row.imageUrl,
    thumbnailData: row.thumbnailUrl,
    promptId: row.promptId,
    prompt: row.prompt || "",
    negativePrompt: row.negativePrompt || "",
    model: row.model || "",
    lora: row.lora || "",
    seed: row.seed || "",
    sampler: row.sampler || "",
    cfgScale: Number(row.cfgScale),
    steps: row.steps || 0,
    creator: row.creator || "",
    note: row.note || "",
    width: row.width || 0,
    height: row.height || 0,
    fileSize: row.fileSize || 0,
    format: row.format || "png",
    tags: row.tags || [],
    isFavorite: row.isFavorite || false,
    createdAt: new Date(row.createdAt),
  }));
};

// -- Comments --
export const createComment = async (
  imageId: string,
  content: string,
): Promise<string> => {
  const userId = await getUserId();
  if (!userId) throw new Error("Chưa đăng nhập");

  const id = crypto.randomUUID();
  const { error } = await supabase.from("comments").insert({
    id,
    imageId,
    content,
    createdAt: new Date().toISOString(),
    user_id: userId,
  });
  if (error) throw error;
  return id;
};

export const getCommentsByImage = async (
  imageId: string,
): Promise<Comment[]> => {
  const userId = await getUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("user_id", userId)
    .eq("imageId", imageId)
    .order("createdAt", { ascending: true });
  if (error) throw error;
  return (data || []).map(row => ({
    ...row,
    createdAt: new Date(row.createdAt),
  }));
};

export const deleteComment = async (id: string): Promise<void> => {
  const userId = await getUserId();
  if (!userId) return;

  const { error } = await supabase
    .from("comments")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);
  if (error) throw error;
};

// -- Tags --
export const createTag = async (
  name: string,
  color: string = "#8b5cf6",
): Promise<string> => {
  const userId = await getUserId();
  if (!userId) throw new Error("Chưa đăng nhập");

  const id = crypto.randomUUID();
  const { error } = await supabase.from("tags").insert({
    id,
    name,
    color,
    user_id: userId,
  });
  if (error) throw error;
  return id;
};

export const getAllTags = async (): Promise<Tag[]> => {
  const userId = await getUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from("tags")
    .select("*")
    .eq("user_id", userId)
    .order("name", { ascending: true });
  if (error) throw error;
  return data || [];
};

export const deleteTag = async (id: string): Promise<void> => {
  const userId = await getUserId();
  if (!userId) return;

  const { error } = await supabase
    .from("tags")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);
  if (error) throw error;
};

// -- Workflows --
export const createWorkflow = async (
  data: Omit<Workflow, "id" | "createdAt" | "updatedAt">,
): Promise<string> => {
  const userId = await getUserId();
  if (!userId) throw new Error("Chưa đăng nhập");

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const { error } = await supabase.from("workflows").insert({
    id,
    title: data.title,
    description: data.description,
    content: data.content,
    type: data.type,
    creator: data.creator,
    tags: data.tags,
    isFavorite: data.isFavorite,
    createdAt: now,
    updatedAt: now,
    user_id: userId,
  });
  if (error) throw error;
  return id;
};

export const getAllWorkflows = async (): Promise<Workflow[]> => {
  const userId = await getUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from("workflows")
    .select("*")
    .eq("user_id", userId)
    .order("createdAt", { ascending: false });
  if (error) throw error;
  return (data || []).map(row => ({
    ...row,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt)
  }));
};

export const deleteWorkflow = async (id: string): Promise<void> => {
  const userId = await getUserId();
  if (!userId) return;

  const { error } = await supabase
    .from("workflows")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);
  if (error) throw error;
};

// -- Stats --
export const getStats = async () => {
  const userId = await getUserId();
  if (!userId) {
    return { promptCount: 0, imageCount: 0, workflowCount: 0, tagCount: 0 };
  }

  const [prompts, images, workflows, tags] = await Promise.all([
    supabase.from("prompts").select("*", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("images").select("*", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("workflows").select("*", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("tags").select("*", { count: "exact", head: true }).eq("user_id", userId),
  ]);
  return {
    promptCount: prompts.count || 0,
    imageCount: images.count || 0,
    workflowCount: workflows.count || 0,
    tagCount: tags.count || 0,
  };
};
