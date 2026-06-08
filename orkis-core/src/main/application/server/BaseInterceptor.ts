export abstract class BaseInterceptor {
  // 현재 불필요하다고 느낌. 우선 주석처리

  // public abstract validate(): Promise<boolean | undefined>;

  // public async isValid(): Promise<boolean> {
  //   let result = await this.validate();

  //   // 명시적 false가 아니면 true 리턴
  //   if (result === undefined || result === true) return true;
  //   return false;
  // }

  public abstract handle(req: any, res: any, error?: any): Promise<void>;
}
