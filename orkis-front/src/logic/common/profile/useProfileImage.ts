/**
 * useProfileImage — 프로필 이미지 업로드/삭제/조회 훅
 * Logic Layer: profileImageStore 래핑 (thin wrapper)
 *
 * 모든 인스턴스가 동일한 Zustand 스토어를 공유하므로
 * cross-instance 동기화가 자동으로 해결됨
 */
import { useEffect } from "react";
import { useProfileImageStore } from "@/logic/common/profile/profileImageStore";
import { useAuthStore } from "@/logic/common/auth/authStore";

export interface UseProfileImageReturn {
  /** 현재 프로필 이미지 Data URL (null = 이미지 없음) */
  profileImageUrl: string | null;
  /** 로딩 상태 */
  isLoading: boolean;
  /** 이미지 업로드 */
  uploadImage: (file: File) => Promise<void>;
  /** 이미지 삭제 */
  deleteImage: () => Promise<void>;
}

export function useProfileImage(): UseProfileImageReturn {
  const imageUrl = useProfileImageStore((s) => s.imageUrl);
  const loading = useProfileImageStore((s) => s.loading);
  const isInitialized = useProfileImageStore((s) => s.isInitialized);
  const fetchImage = useProfileImageStore((s) => s.fetchImage);
  const uploadImage = useProfileImageStore((s) => s.uploadImage);
  const deleteImage = useProfileImageStore((s) => s.deleteImage);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // 인증 완료 후 초기 fetch (아직 초기화되지 않았으면)
  useEffect(() => {
    if (isAuthenticated && !isInitialized && !loading) {
      fetchImage();
    }
  }, [isAuthenticated, isInitialized, loading, fetchImage]);

  return {
    profileImageUrl: imageUrl,
    isLoading: loading,
    uploadImage,
    deleteImage,
  };
}
