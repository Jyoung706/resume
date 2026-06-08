/**
 * Background Image Service — 채팅방 배경 이미지 API + sessionStorage 캐싱
 */
import { apiPost, API_BASE } from "@/logic/shared/services/request";
import { getLogger } from "@/logic/shared/utils/logger";

const logger = getLogger("BackgroundService");

// ── 타입 ────────────────────────────────────

interface BackgroundImageResponse {
  message: string;
  imagePath?: string;
  imageUrl?: string;
}

interface BackgroundImageInfoResponse {
  hasImage: boolean;
  imagePath: string | null;
  imageUrl: string | null;
}

// ── sessionStorage 캐시 ─────────────────────

const CACHE_KEY = "orkis_background_image_cache";

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
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

/** 배경 이미지 업로드 */
async function uploadImage(file: File): Promise<BackgroundImageResponse> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("허용되지 않는 파일 형식입니다. (JPG, PNG, GIF, WEBP만 가능)");
  }
  if (file.size > MAX_SIZE) {
    throw new Error("파일 크기가 너무 큽니다. (최대 10MB)");
  }

  const formData = new FormData();
  formData.append("image", file);

  const response = await fetch(`${API_BASE}/profile/background/upload`, {
    method: "POST",
    body: formData,
    credentials: "include",
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || err.message || "배경 이미지 업로드에 실패했습니다.");
  }

  const data = await response.json();
  const result = data.success ? (data.data || data.result) : data;

  // 캐시 무효화
  invalidateCache();

  return result;
}

/** 배경 이미지 삭제 */
async function deleteImage(): Promise<BackgroundImageResponse> {
  const result = await apiPost<BackgroundImageResponse>("/profile/background/delete");
  invalidateCache();
  return result;
}

/** 배경 이미지 정보 조회 */
async function getImageInfo(): Promise<BackgroundImageInfoResponse> {
  return apiPost<BackgroundImageInfoResponse>("/profile/background/info");
}

/** 배경 이미지 조회 (캐시 우선) */
async function fetchImage(userId?: string): Promise<string | null> {
  const cacheKey = userId || "_self";
  const cache = loadCache();
  if (cache[cacheKey]) return cache[cacheKey].dataUrl;

  try {
    const response = await fetch(`${API_BASE}/profile/background/get`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("배경 이미지 조회에 실패했습니다.");
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

export const backgroundService = {
  uploadImage,
  deleteImage,
  getImageInfo,
  fetchImage,
  getCached,
  invalidateCache,
};
