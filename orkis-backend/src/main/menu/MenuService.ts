import { Autowired, Service } from "@orkis/core/common";
import { MenuDao, MENU_INFO } from "./MenuDao";
import { OrkisError } from "../error/OrkisError";

@Service("MenuService")
export class MenuService {
  @Autowired("MenuDao")
  public menuDao!: MenuDao;

  // 호출 및 사용여부: 사용됨
  // 호출 위치: orkis-backend/src/main/menu/MenuController.ts - getUserMenus() 메서드 (라인 26, 39)
  /**
   * 사용자별 메뉴 조회
   */
  async getUserMenus(userId: string): Promise<any> {
    try {
      if (!userId) {
        throw new OrkisError("User not authenticated");
      }

      // 사용자 권한 조회
      const userAuth = await this.menuDao.getUserAuth(userId);
      if (!userAuth) {
        throw new OrkisError("User authorization not found");
      }

      // 사용자별 메뉴 조회
      const userMenus = await this.menuDao.getUserMenus(userId);

      return {
        success: true,
        data: {
          menus: userMenus,
          authCode: userAuth.AUTH_CODE
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // 호출 및 사용여부: 사용됨
  // 호출 위치: orkis-backend/src/main/menu/MenuController.ts - getAllMenus() 메서드 (라인 52)
  /**
   * 전체 메뉴 조회 (관리자용)
   */
  async getAllMenus(userId: string): Promise<any> {
    try {
      // 관리자 권한 체크
      const isAdmin = await this.menuDao.isAdmin(userId);
      if (!isAdmin) {
        throw new OrkisError("Admin access required");
      }

      const allMenus = await this.menuDao.getAllMenus();

      return {
        success: true,
        data: allMenus
      };
    } catch (error) {
      throw error;
    }
  }
}
