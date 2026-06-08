// import * as dotenv from "dotenv";
// import * as fs from 'fs-extra';
// import * as childProcess from 'child_process';

// // 환경에 맞는 .env 파일 로드
// dotenv.config();

// logger.info('🛠️  Build process initiated');
import * as fs from "fs-extra";
import * as childProcess from "child_process";

const ignored: string[] = ["index.d.ts", "index.d.ts"];
(async () => {
  try {
    // simpleFileIndex();
    await remove("./lib/");
    await exec("yarn core:build", "./");
    // await exec('tsc -p tsconfig.temp.json', './');
  } catch (err) {
    console.info(err);
  }
})();

function remove(loc: string): Promise<void> {
  return new Promise((res, rej) => {
    return fs.remove(loc, (err) => {
      return !!err ? rej(err) : res();
    });
  });
}

function copy(src: string, dest: string): Promise<void> {
  return new Promise((res, rej) => {
    return fs.copy(src, dest, (err) => {
      return !!err ? rej(err) : res();
    });
  });
}

function exec(cmd: string, loc: string): Promise<void> {
  return new Promise((res, rej) => {
    return childProcess.exec(cmd, { cwd: loc }, (err, stdout, stderr) => {
      if (!!stdout) {
        console.info(stdout);
      }
      if (!!stderr) {
        console.info(stderr);
      }
      return !!err ? rej(err) : res();
    });
  });
}
