import {
  Request as ExpressRequest,
  Response as ExpressResponse,
  NextFunction as ExpressNextFunction
} from "express";
import { Readable } from "stream";
import { Session, SessionData } from "express-session";

export interface Request extends ExpressRequest {
  context: Record<string, any>;
  session: Session & Partial<CustomSessionData>;
}

export interface Response extends ExpressResponse {}

export interface NextFunction extends ExpressNextFunction {}

interface CustomSessionData extends SessionData {
  [key: string]: any;
}

export interface MulterFile extends Express.Multer.File {}

export type HttpMethod = "get" | "post" | "put" | "patch" | "delete";

export interface REQUEST_CONTEXT_INTERFACE {
  id: number;
  request: any;
  response: any;
  packet: any;
}
export interface FileResponse {
  type: "file";
  filename: string;
  mimeType?: string;
  data: Buffer | Readable;
}

export interface RedirectResponse {
  type: "redirect";
  url: string;
  status?: number;
}

export type AppResponse =
  | FileResponse
  | RedirectResponse
  | string
  | Buffer
  | object
  | null
  | undefined;
export interface ERROR_RESPONSE {
  statusCode: Number;
  type: string;
  message?: string;
}
