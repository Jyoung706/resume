/**
 * @see https://stackoverflow.com/questions/39392853/is-there-a-type-for-class-in-typescript-and-does-any-include-it
 */
export interface ClassType<T, A extends any[] = any[]> extends Function {
  new (...args: A): T;
}
export type ValueType = string | number | boolean | symbol;

export type Union<
  T extends { [k: string]: ValueType } | ReadonlyArray<ValueType>
> =
  T extends ReadonlyArray<ValueType>
    ? T[number]
    : T extends { [k: string]: infer U }
      ? U
      : never;

export type CLASS_TYPE = { new (...args: any[]): {} };
