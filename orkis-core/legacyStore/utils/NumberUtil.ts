export class NumberUtil {
  public static isNull(val: number): boolean {
    if (val === undefined || val === null || isNaN(val)) {
      return true;
    }

    return false;
  }

  public static isNullCheck(val: number, defaultValue = 0): number {
    if (this.isNull(val)) {
      return defaultValue;
    }

    return val;
  }
}
