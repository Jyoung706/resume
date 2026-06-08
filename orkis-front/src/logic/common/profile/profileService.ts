/**
 * Profile Image Service — 프로필 이미지 API + sessionStorage 캐싱
 */
import { apiPost, API_BASE } from "@/logic/shared/services/request";
import { getLogger } from "@/logic/shared/utils/logger";

const logger = getLogger("ProfileService");

// ── 타입 ────────────────────────────────────

interface ProfileImageResponse {
  message: string;
  imagePath?: string;
  imageUrl?: string;
}

interface ProfileImageInfoResponse {
  hasImage: boolean;
  imagePath: string | null;
  imageUrl: string | null;
}

// ── sessionStorage 캐시 ─────────────────────

const CACHE_KEY = "orkis_profile_image_cache";

interface CacheEntry {
  dataUrl: string;
  timestamp: number;
}

type ImageCache = Record<string, CacheEntry>;

function loadCache(): ImageCache {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveCache(cache: ImageCache): void {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    sessionStorage.removeItem(CACHE_KEY);
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ── API ─────────────────────────────────────

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

/** 프로필 이미지 업로드 */
async function uploadImage(file: File): Promise<ProfileImageResponse> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("허용되지 않는 파일 형식입니다. (JPG, PNG, GIF, WEBP만 가능)");
  }
  if (file.size > MAX_SIZE) {
    throw new Error("파일 크기가 너무 큽니다. (최대 5MB)");
  }

  const formData = new FormData();
  formData.append("image", file);

  const response = await fetch(`${API_BASE}/profile/image/upload`, {
    method: "POST",
    body: formData,
    credentials: "include",
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || err.message || "프로필 이미지 업로드에 실패했습니다.");
  }

  const data = await response.json();
  const result = data.success ? (data.data || data.result) : data;

  // 캐시 무효화
  invalidateCache();

  return result;
}

/** 프로필 이미지 삭제 */
async function deleteImage(): Promise<ProfileImageResponse> {
  const result = await apiPost<ProfileImageResponse>("/profile/image/delete");
  invalidateCache();
  return result;
}

/** 프로필 이미지 정보 조회 */
async function getImageInfo(): Promise<ProfileImageInfoResponse> {
  return apiPost<ProfileImageInfoResponse>("/profile/image/info");
}

/** 프로필 이미지 조회 (캐시 우선) */
async function fetchImage(userId?: string): Promise<string | null> {
  const cacheKey = userId || "_self";
  const cache = loadCache();
  if (cache[cacheKey]) return cache[cacheKey].dataUrl;

  try {
    const response = await fetch(`${API_BASE}/profile/image/get`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("프로필 이미지 조회에 실패했습니다.");
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      // JSON 응답 = 이미지 미설정
      return null;
    }

    const blob = await response.blob();
    const dataUrl = await blobToDataUrl(blob);

    cache[cacheKey] = { dataUrl, timestamp: Date.now() };
    saveCache(cache);

    return dataUrl;
  } catch (error) {
    logger.error("fetchImage:", error);
    return null;
  }
}

/** 캐시에서 즉시 조회 (동기) */
function getCached(userId?: string): string | null {
  const cacheKey = userId || "_self";
  return loadCache()[cacheKey]?.dataUrl || null;
}

/** 캐시 무효화 */
function invalidateCache(userId?: string): void {
  const cacheKey = userId || "_self";
  const cache = loadCache();
  delete cache[cacheKey];
  saveCache(cache);
}

export const profileService = {
  uploadImage,
  deleteImage,
  getImageInfo,
  fetchImage,
  getCached,
  invalidateCache,
};
