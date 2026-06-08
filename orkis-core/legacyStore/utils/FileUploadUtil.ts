// import multer from "multer";

// const commonMulter = multer();

// export class FileUploadUtil {
//   public static async getMultiparts(
//     rc: any,
//     fileName: string
//   ): Promise<Express.Multer.File | undefined> {
//     const req = rc.request;
//     const res = rc.request.response;

//     return new Promise<Express.Multer.File | undefined>((resolve, reject) => {
//       commonMulter.array(fileName)(req, res, function (err) {
//         try {
//           if (err instanceof multer.MulterError) {
//             // A Multer error occurred when uploading.
//             logger.debug(err);
//             resolve(undefined);
//           } else if (err) {
//             logger.debug(err);
//             // An unknown error occurred when uploading.
//             resolve(undefined);
//           }

//           if (!req.files || req.files.length < 1) {
//             resolve(undefined);
//           }

//           if (req.files.length == 1) {
//             resolve(req.files[0]);
//           }

//           resolve(req.files);
//         } catch (e) {
//           resolve(undefined);
//         }
//       });
//     });
//   }
// }
