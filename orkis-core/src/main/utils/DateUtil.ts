const DEFAULT_DATE_FORMAT = "yyyy-MM-DD";
const DEFAULT_DATE_TIME_FORMAT = "yyyy-MM-DD H:i:s";

export default class DateUtil {
  public static getCurrentDate(format?: string): string {
    return this.toDateString(
      new Date(),
      !format ? DEFAULT_DATE_FORMAT : format
    );
  }

  public static getCurrentDateTime(format?: string): string {
    return this.toDateString(
      new Date(),
      !format ? DEFAULT_DATE_TIME_FORMAT : format
    );
  }

  public static toDateString(date: Date, format?: string): string {
    return this.toDateFormat(date, !format ? DEFAULT_DATE_FORMAT : format);
  }

  public static toDateTimeString(date: Date, format?: string): string {
    return this.toDateFormat(date, !format ? DEFAULT_DATE_TIME_FORMAT : format);
  }

  public static toDigitsString(
    value: number | string,
    len: number = 2
  ): string {
    let lenthValue = value.toString().length;
    if (lenthValue == len) {
      return value.toString();
    }

    let cntStr = "";
    let cnt = len - lenthValue;
    while (cnt > 0) {
      cntStr += "0";
      cnt--;
    }
    return `${cntStr}${value}`;
  }

  public static toDateFormat(date: Date, format: string) {
    return format.replace(/(yyyy|mm|dd|MM|DD|H|i|s)/g, (t: string): any => {
      switch (t) {
        case "yyyy":
          return date.getFullYear();
        case "mm":
          return date.getMonth() + 1;
        case "dd":
          return date.getDate();
        case "MM":
          return this.toDigitsString(date.getMonth() + 1);
        case "DD":
          return this.toDigitsString(date.getDate());
        case "H": //hh24 ?
          return this.toDigitsString(date.getHours());
        case "i": //minuate digit string ?
          return this.toDigitsString(date.getMinutes());
        case "s":
          return this.toDigitsString(date.getSeconds());
        default:
          return "";
      }
    });
  }

  public static addMonth(date: Date, gap: number): Date {
    let yy1: number = date.getFullYear();
    let mm1: number = date.getMonth();
    let dd1: number = date.getDate();
    return new Date(yy1, mm1 + gap, dd1);
  }

  public static addDay(date: Date, gap: number): Date {
    let yy1: number = date.getFullYear();
    let mm1: number = date.getMonth();
    let dd1: number = date.getDate();
    return new Date(yy1, mm1, dd1 + gap);
  }
}
