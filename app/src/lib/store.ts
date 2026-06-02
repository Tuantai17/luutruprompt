import { create } from "zustand";

interface AppState {
  // Sidebar
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  // Gallery view mode
  galleryView: "masonry" | "grid";
  setGalleryView: (view: "masonry" | "grid") => void;

  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Lightbox
  lightboxOpen: boolean;
  lightboxImageId: string | null;
  openLightbox: (imageId: string) => void;
  closeLightbox: () => void;

  // Upload modal
  uploadModalOpen: boolean;
  setUploadModalOpen: (open: boolean) => void;

  // Prompt editor
  promptEditorOpen: boolean;
  editingPromptId: string | null;
  openPromptEditor: (id?: string) => void;
  closePromptEditor: () => void;

  // Active filters
  activeTagFilters: string[];
  toggleTagFilter: (tag: string) => void;
  clearTagFilters: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Sidebar
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  // Gallery
  galleryView: "masonry",
  setGalleryView: (view) => set({ galleryView: view }),

  // Search
  searchQuery: "",
  setSearchQuery: (query) => set({ searchQuery: query }),

  // Lightbox
  lightboxOpen: false,
  lightboxImageId: null,
  openLightbox: (imageId) =>
    set({ lightboxOpen: true, lightboxImageId: imageId }),
  closeLightbox: () => set({ lightboxOpen: false, lightboxImageId: null }),

  // Upload
  uploadModalOpen: false,
  setUploadModalOpen: (open) => set({ uploadModalOpen: open }),

  // Prompt editor
  promptEditorOpen: false,
  editingPromptId: null,
  openPromptEditor: (id) =>
    set({ promptEditorOpen: true, editingPromptId: id || null }),
  closePromptEditor: () =>
    set({ promptEditorOpen: false, editingPromptId: null }),

  // Filters
  activeTagFilters: [],
  toggleTagFilter: (tag) =>
    set((s) => ({
      activeTagFilters: s.activeTagFilters.includes(tag)
        ? s.activeTagFilters.filter((t) => t !== tag)
        : [...s.activeTagFilters, tag],
    })),
  clearTagFilters: () => set({ activeTagFilters: [] }),
}));
