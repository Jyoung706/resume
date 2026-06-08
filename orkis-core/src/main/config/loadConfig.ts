import { ApplicationEnvironment } from "./ApplicationEnvironment";
import commandLineArgs, { CommandLineOptions } from "command-line-args";

const CMD_ARGS = Object.freeze({
  TYPE: { name: "env", type: String, alias: "e", defaultValue: "prod" }
});

export const getCliArgs = function (
  cmdArgsType?: commandLineArgs.OptionDefinition[]
) {
  if (!cmdArgsType) {
    return commandLineArgs([CMD_ARGS.TYPE]);
  } else {
    return commandLineArgs(cmdArgsType);
  }
};
// 환경 설정 자동 로드 함수
export function loadConfig(options: CommandLineOptions): void {
  ApplicationEnvironment.loadConfiguration(options.env);
}
