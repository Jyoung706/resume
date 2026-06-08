export interface ContainerDef {
  name: string;
  image: string;
  tar: string;
  appDir: string;
  dockerfile: string;
  port?: number;
  debugPort?: number;
}

export const CONTAINERS: Record<"backend" | "ai", ContainerDef> = {
  backend: {
    name: "orkis-backend",
    image: "orkis-backend:desktop",
    tar: "orkis-backend.tar",
    appDir: "orkis-backend",
    dockerfile: "Dockerfile.desktop",
    port: process.env.MAIN_BACKEND_PORT ? Number(process.env.MAIN_BACKEND_PORT) : 19800,
    debugPort: 9229,
  },
  ai: {
    name: "orkis-ai",
    image: "orkis-ai:desktop",
    tar: "orkis-ai.tar",
    appDir: "orkis-desktop-ai",
    dockerfile: "Dockerfile.desktop",
    port: process.env.MAIN_AI_PORT ? Number(process.env.MAIN_AI_PORT) : 19900,
    debugPort: 5678,
  },
};

export const DATA_SUBDIRS = [
  "db",
  "share/sqlite",
  "share/jobs",
  "share/summary",
  "storage",
  "session",
  "chat/context",
  "chat/summary",
];
