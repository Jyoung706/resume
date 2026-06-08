import {
  Autowired,
  Controller,
  RequestMapping,
  Session,
  FILTER_TYPES,
  REQUEST_METHOD
} from "@orkis/core/common";
import { MenuService } from "./MenuService";

@Controller({ path: "/menu" })
export class MenuController {
  @Autowired("MenuService")
  public menuService!: MenuService;

  // 호출 및 사용여부: 호출 안됨
  // 호출 위치: 호출 위치 없음 (useMenuStore에서 간접 호출 가능성)
  @RequestMapping({
    route: "/user-menus",
    method: REQUEST_METHOD.GET,
    filteredType: FILTER_TYPES.CHECK_SESSION
  })
  async getUserMenus(@Session() session: any): Promise<any> {
    // session.login_info에 직접 사용자 정보가 있음 (user 객체로 래핑되지 않음)
    const userId = session?.login_info?.ID;

    return await this.menuService.getUserMenus(userId);
  }

  // 호출 및 사용여부: 호출 안됨
  // 호출 위치: 호출 위치 없음 (useMenuStore에서 간접 호출 가능성)
  @RequestMapping({
    route: "/user-menus",
    method: REQUEST_METHOD.POST,
    filteredType: FILTER_TYPES.CHECK_SESSION
  })
  async getUserMenusPost(@Session() session: any): Promise<any> {
    // session.login_info에 직접 사용자 정보가 있음 (user 객체로 래핑되지 않음)
    const userId = session?.login_info?.ID;
    return await this.menuService.getUserMenus(userId);
  }

  // 호출 및 사용여부: 호출 안됨
  // 호출 위치: 호출 위치 없음
  @RequestMapping({
    route: "/all",
    method: REQUEST_METHOD.POST,
    filteredType: FILTER_TYPES.CHECK_SESSION
  })
  async getAllMenus(@Session() session: any): Promise<any> {
    // session.login_info에 직접 사용자 정보가 있음 (user 객체로 래핑되지 않음)
    const userId = session?.login_info?.ID;
    return await this.menuService.getAllMenus(userId);
  }
}
