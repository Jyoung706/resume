import multer from "multer";

import fs from "fs-extra";
import path from "path";
import { IFileUploadConfig, MultipartConfig } from "../../config";

export class MulterHelper {
  private static readonly DEFAULT_CONFIG: Required<IFileUploadConfig> = {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    maxCount: 1,
    tempDir: "./uploads/tmp",
    allowedMimeTypes: []
  };

  private static readonly MULTER_ERROR_MESSAGES: Record<
    string,
    (
      error: any,
      fields: Array<{ name: string; maxCount: number }>,
      config: Required<IFileUploadConfig>
    ) => string
  > = {
    LIMIT_FILE_SIZE: (error, fields, config) => {
      const maxSizeMB = (config.maxFileSize / 1024 / 1024).toFixed(2);
      return `File too large. Maximum size: ${maxSizeMB}MB (Received: ${error.field || "unknown field"})`;
    },

    LIMIT_UNEXPECTED_FILE: (error, fields, config) => {
      const allowedFields = fields.map((f) => f.name).join(", ");
      return `Unexpected field: "${error.field}". Allowed fields: [${allowedFields}]`;
    },

    LIMIT_FILE_COUNT: (error, fields, config) => {
      return `Too many files. Maximum count: ${config.maxCount} per field`;
    },

    LIMIT_FIELD_KEY: () => "Field name too long",
    LIMIT_FIELD_VALUE: () => "Field value too long",
    LIMIT_FIELD_COUNT: () => "Too many fields",
    LIMIT_PART_COUNT: () => "Too many parts"
  };

  static createMulter(
    routeConfig?: MultipartConfig | IFileUploadConfig | undefined,
    fields?: Array<{ name: string; maxCount: number }>,
    appConfig?: IFileUploadConfig | null
  ) {
    const config = this.mergeConfig(routeConfig, appConfig);

    if (!fs.existsSync(config.tempDir)) {
      fs.mkdirSync(config.tempDir, { recursive: true });
    }

    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, config.tempDir);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, uniqueSuffix + ext);
      }
    });

    const fileFilter = (req: any, file: Express.Multer.File, cb: any) => {
      if (config.allowedMimeTypes && config.allowedMimeTypes.length > 0) {
        if (config.allowedMimeTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error(`File type not allowed ${file.mimetype}.`), false);
        }
      } else {
        cb(null, true);
      }
    };

    const limits = {
      fileSize: config.maxFileSize,
      files: config.maxCount
    };

    const upload = multer({ storage, limits, fileFilter });

    const fieldsConfig =
      fields && fields.length > 0
        ? fields
        : [{ name: "file", maxCount: config.maxCount }];

    const multerMiddleware = upload.fields(fieldsConfig);

    return (req: any, res: any, next: any) => {
      multerMiddleware(req, res, (error) => {
        if (error) {
          const multerError = this.convertMulterError(
            error,
            fieldsConfig,
            config
          );
          return next(multerError);
        }
        next();
      });
    };
  }

  private static mergeConfig(
    routeConfig?: MultipartConfig | IFileUploadConfig,
    appConfig?: IFileUploadConfig | null
  ): Required<IFileUploadConfig> {
    return {
      maxFileSize:
        routeConfig?.maxFileSize ??
        appConfig?.maxFileSize ??
        this.DEFAULT_CONFIG.maxFileSize,
      maxCount:
        routeConfig?.maxCount ??
        appConfig?.maxCount ??
        this.DEFAULT_CONFIG.maxCount,
      allowedMimeTypes:
        routeConfig?.allowedMimeTypes ??
        appConfig?.allowedMimeTypes ??
        this.DEFAULT_CONFIG.allowedMimeTypes,
      tempDir:
        (routeConfig as IFileUploadConfig)?.tempDir ??
        appConfig?.tempDir ??
        this.DEFAULT_CONFIG.tempDir
    };
  }

  private static convertMulterError(
    error: any,
    fields: Array<{ name: string; maxCount: number }>,
    config: Required<IFileUploadConfig>
  ) {
    if (!error.code) {
      return error;
    }

    const messageGenerator = this.MULTER_ERROR_MESSAGES[error.code];
    if (messageGenerator) {
      return new Error(messageGenerator(error, fields, config));
    }

    return error;
  }
}
