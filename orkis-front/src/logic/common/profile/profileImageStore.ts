/**
 * 프로필 이미지 상태 관리 Store (Zustand)
 * Single source of truth — 모든 useProfileImage 인스턴스가 이 상태를 공유
 */
import { create } from "zustand";
import { profileService } from "@/logic/common/profile/profileService";
import { useAuthStore } from "@/logic/common/auth/authStore";
import { getLogger } from "@/logic/shared/utils/logger";
import { showToast } from "@/logic/shared/utils/toast";

const logger = getLogger("ProfileImageStore");

interface ProfileImageState {
  imageUrl: string | null;
  loading: boolean;
  isInitialized: boolean;
  error: string | null;

  fetchImage: () => Promise<void>;
  uploadImage: (file: File) => Promise<void>;
  deleteImage: () => Promise<void>;
  reset: () => void;
}

export const useProfileImageStore = create<ProfileImageState>((set, get) => ({
  imageUrl: profileService.getCached(),
  loading: false,
  isInitialized: false,
  error: null,

  fetchImage: async () => {
    if (get().loading) return;

    // 인증되지 않은 상태에서는 API 호출 방지
    if (!useAuthStore.getState().isAuthenticated) return;

    const cached = profileService.getCached();
    if (cached) {
      set({ imageUrl: cached, isInitialized: true });
      return;
    }

    set({ loading: true, error: null });
    try {
      const url = await profileService.fetchImage();
      set({ imageUrl: url, loading: false, isInitialized: true });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "프로필 이미지 조회 실패";
      logger.error("fetchImage:", error);
      set({ error: message, loading: false, isInitialized: true });
    }
  },

  uploadImage: async (file: File) => {
    if (get().loading) return;
    set({ loading: true, error: null });
    try {
      await profileService.uploadImage(file);
      const newUrl = await profileService.fetchImage();
      set({ imageUrl: newUrl, loading: false });

      window.dispatchEvent(
        new CustomEvent("auth:updateUser", { detail: { profileImage: newUrl } })
      );
      showToast("프로필 이미지가 업로드되었습니다.", "success");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "프로필 이미지 업로드에 실패했습니다.";
      logger.error("프로필 이미지 업로드 실패:", error);
      set({ error: message, loading: false });
      showToast(message, "error");
    }
  },

  deleteImage: async () => {
    if (get().loading) return;
    set({ loading: true, error: null });
    try {
      await profileService.deleteImage();
      set({ imageUrl: null, loading: false });

      window.dispatchEvent(
        new CustomEvent("auth:updateUser", { detail: { profileImage: null } })
      );
      showToast("프로필 이미지가 삭제되었습니다.", "success");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "프로필 이미지 삭제에 실패했습니다.";
      logger.error("프로필 이미지 삭제 실패:", error);
      set({ error: message, loading: false });
      showToast(message, "error");
    }
  },

  reset: () => {
    profileService.invalidateCache();
    set({ imageUrl: null, loading: false, isInitialized: false, error: null });
  },
}));
