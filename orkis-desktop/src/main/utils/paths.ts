import { dirname, join } from "path";

export function getPreloadPath(): string {
  return join(__dirname, "../preload/index.js");
}

export function getRendererPath(filePath: string): string {
  return join(dirname(__dirname), "renderer", filePath);
}

export function getRendererUrl(): string {
  return "orkis://app/index.html";
}
