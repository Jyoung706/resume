// ============================================
// templateRoutes.tsx — 템플릿/문서 라우트 정의
// 디자인 시스템 컴포넌트 쇼케이스
// ============================================

import { MainLayout } from "@/layouts/MainLayout";
import { type RouteObject } from "react-router-dom";
import { lazyLoad } from "@/router/lazyLoad";

// --- Lazy imports ---

const TemplatePage = lazyLoad(
  () => import("@/pages/__dev/template/TemplatePage"),
  m => m.TemplatePage
);
const AllComponentsTemplate = lazyLoad(
  () => import("@/pages/__dev/template/AllComponentsTemplate"),
  m => m.AllComponentsTemplate
);
const ButtonTemplate = lazyLoad(
  () => import("@/pages/__dev/template/ButtonTemplate"),
  m => m.ButtonTemplate
);
const InputTemplate = lazyLoad(
  () => import("@/pages/__dev/template/InputTemplate"),
  m => m.InputTemplate
);
const TypographyTemplate = lazyLoad(
  () => import("@/pages/__dev/template/TypographyTemplate"),
  m => m.TypographyTemplate
);
const ModalTemplate = lazyLoad(
  () => import("@/pages/__dev/template/ModalTemplate"),
  m => m.ModalTemplate
);
const LayoutTemplate = lazyLoad(
  () => import("@/pages/__dev/template/LayoutTemplate"),
  m => m.LayoutTemplate
);
const AlertTemplate = lazyLoad(
  () => import("@/pages/__dev/template/AlertTemplate"),
  m => m.AlertTemplate
);
const AccordionTemplate = lazyLoad(
  () => import("@/pages/__dev/template/AccordionTemplate"),
  m => m.AccordionTemplate
);
const IconTemplate = lazyLoad(
  () => import("@/pages/__dev/template/IconTemplate"),
  m => m.IconTemplate
);
const ColorSizeTemplate = lazyLoad(
  () => import("@/pages/__dev/template/ColorSizeTemplate"),
  m => m.ColorSizeTemplate
);
const PresetTemplate = lazyLoad(
  () => import("@/pages/__dev/template/PresetTemplate"),
  m => m.PresetTemplate
);
const SelectTemplate = lazyLoad(
  () => import("@/pages/__dev/template/SelectTemplate"),
  m => m.SelectTemplate
);
const ListTemplate = lazyLoad(
  () => import("@/pages/__dev/template/ListTemplate"),
  m => m.ListTemplate
);
const DrawerTemplate = lazyLoad(
  () => import("@/pages/__dev/template/DrawerTemplate"),
  m => m.DrawerTemplate
);
const DialogTemplate = lazyLoad(
  () => import("@/pages/__dev/template/DialogTemplate"),
  m => m.DialogTemplate
);
const SurfaceTemplate = lazyLoad(
  () => import("@/pages/__dev/template/SurfaceTemplate"),
  m => m.SurfaceTemplate
);
const FormTemplate = lazyLoad(
  () => import("@/pages/__dev/template/FormTemplate"),
  m => m.FormTemplate
);
const MediaTemplate = lazyLoad(
  () => import("@/pages/__dev/template/MediaTemplate"),
  m => m.MediaTemplate
);
const AppBarTemplate = lazyLoad(
  () => import("@/pages/__dev/template/AppBarTemplate"),
  m => m.AppBarTemplate
);
const SnackbarTemplate = lazyLoad(
  () => import("@/pages/__dev/template/SnackbarTemplate"),
  m => m.SnackbarTemplate
);
const NavigationTemplate = lazyLoad(
  () => import("@/pages/__dev/template/NavigationTemplate"),
  m => m.NavigationTemplate
);
const DomainTemplate = lazyLoad(
  () => import("@/pages/__dev/template/DomainTemplate"),
  m => m.DomainTemplate
);
const ChipTemplate = lazyLoad(
  () => import("@/pages/__dev/template/ChipTemplate"),
  m => m.ChipTemplate
);
const CheckboxTemplate = lazyLoad(
  () => import("@/pages/__dev/template/CheckboxTemplate"),
  m => m.CheckboxTemplate
);
const FormFieldTemplate = lazyLoad(
  () => import("@/pages/__dev/template/FormFieldTemplate"),
  m => m.FormFieldTemplate
);
const RadioTemplate = lazyLoad(
  () => import("@/pages/__dev/template/RadioTemplate"),
  m => m.RadioTemplate
);
const CircularProgressSizeTemplate = lazyLoad(
  () => import("@/pages/__dev/template/CircularProgressSizeTemplate"),
  m => m.CircularProgressSizeTemplate
);
const PanelHeaderTemplate = lazyLoad(
  () => import("@/pages/__dev/template/PanelHeaderTemplate"),
  m => m.PanelHeaderTemplate
);
const AuthCardTemplate = lazyLoad(
  () => import("@/pages/__dev/template/AuthCardTemplate"),
  m => m.AuthCardTemplate
);

// DashboardPage — dev-only로 /template/dashboard에 배치
const DashboardPage = lazyLoad(
  () => import("@/pages/__dev/dashboard"),
  m => m.DashboardPage
);

export const templateRoutes: RouteObject[] = [
  {
    path: "/template",
    element: <MainLayout />,
    children: [
      { index: true, element: <TemplatePage /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "all", element: <AllComponentsTemplate /> },
      { path: "button", element: <ButtonTemplate /> },
      { path: "input", element: <InputTemplate /> },
      { path: "typography", element: <TypographyTemplate /> },
      { path: "modal", element: <ModalTemplate /> },
      { path: "layout", element: <LayoutTemplate /> },
      { path: "alert", element: <AlertTemplate /> },
      { path: "accordion", element: <AccordionTemplate /> },
      { path: "icon", element: <IconTemplate /> },
      { path: "color-size", element: <ColorSizeTemplate /> },
      { path: "preset", element: <PresetTemplate /> },
      { path: "select", element: <SelectTemplate /> },
      { path: "list", element: <ListTemplate /> },
      { path: "drawer", element: <DrawerTemplate /> },
      { path: "dialog", element: <DialogTemplate /> },
      { path: "surface", element: <SurfaceTemplate /> },
      { path: "form", element: <FormTemplate /> },
      { path: "media", element: <MediaTemplate /> },
      { path: "appbar", element: <AppBarTemplate /> },
      { path: "snackbar", element: <SnackbarTemplate /> },
      { path: "navigation", element: <NavigationTemplate /> },
      { path: "domain", element: <DomainTemplate /> },
      { path: "chip", element: <ChipTemplate /> },
      { path: "checkbox", element: <CheckboxTemplate /> },
      { path: "form-field", element: <FormFieldTemplate /> },
      { path: "radio", element: <RadioTemplate /> },
      { path: "circular-progress-size", element: <CircularProgressSizeTemplate /> },
      { path: "panel-header", element: <PanelHeaderTemplate /> },
      { path: "auth-card", element: <AuthCardTemplate /> }
    ]
  }
];
