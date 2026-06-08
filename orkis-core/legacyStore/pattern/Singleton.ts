export default class Singleton {
  [key: string]: any;
  public static instance: any;

  public static getInstance() {
    if (this.instance) {
      return this.instance;
    }
    this.instance = new this();
    return this.instance;
  }
}
