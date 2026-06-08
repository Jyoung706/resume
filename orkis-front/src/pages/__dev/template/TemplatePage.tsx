// ============================================
// 템플릿 메인 페이지 — 컴포넌트 쇼케이스 네비게이션
// ============================================

import {
  AnnouncementIcon,
  ArrowDropDownCircleIcon,
  AutoAwesomeIcon,
  Box,
  CardActionArea,
  CheckBoxIcon,
  DynamicFormIcon,
  FlexBox,
  Grid,
  InputIcon,
  LabelIcon,
  LayersIcon,
  ListIcon,
  MenuOpenIcon,
  NavigationIcon,
  NotificationsIcon,
  PaletteIcon,
  Paper,
  PermMediaIcon,
  RadioButtonCheckedIcon,
  SmartButtonIcon,
  StorefrontIcon,
  TextFieldsIcon,
  TuneIcon,
  Typography,
  UnfoldMoreIcon,
  ViewQuiltIcon,
  ViewStreamIcon,
  WebAssetIcon,
  WebAssetOffIcon,
  WebIcon
} from "@/components";
import { type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import "./Template.scss";

// ============================================
// TemplateCard — 내부 컴포넌트
// ============================================

interface TemplateCardProps {
  icon: ReactNode;
  label: string;
  desc: string;
  onClick: () => void;
}

function TemplateCard({ icon, label, desc, onClick }: TemplateCardProps) {
  return (
    <Paper
      className="ok-template-card"
      rounded="md"
      shadow="card"
      height="100%"
    >
      <CardActionArea onClick={onClick}>
        <FlexBox direction="column" align="center" gap={1}>
          {icon}
          <Typography variant="h6">{label}</Typography>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            {desc}
          </Typography>
        </FlexBox>
      </CardActionArea>
    </Paper>
  );
}

// ============================================
// 템플릿 데이터
// ============================================

const TEMPLATES = [
  {
    label: "Button",
    path: "/template/button",
    icon: <SmartButtonIcon fontSize="large" />,
    desc: "Button variants, colors, sizes"
  },
  {
    label: "Input",
    path: "/template/input",
    icon: <InputIcon fontSize="large" />,
    desc: "TextField, SearchInput, PasswordInput"
  },
  {
    label: "Typography",
    path: "/template/typography",
    icon: <TextFieldsIcon fontSize="large" />,
    desc: "Typography variants, scale"
  },
  {
    label: "Modal",
    path: "/template/modal",
    icon: <WebAssetIcon fontSize="large" />,
    desc: "Modal, ConfirmModal"
  },
  {
    label: "Layout",
    path: "/template/layout",
    icon: <ViewQuiltIcon fontSize="large" />,
    desc: "FlexBox, Stack, Container"
  },
  {
    label: "Alert",
    path: "/template/alert",
    icon: <NotificationsIcon fontSize="large" />,
    desc: "Alert, Toast notifications"
  },
  {
    label: "Accordion",
    path: "/template/accordion",
    icon: <UnfoldMoreIcon fontSize="large" />,
    desc: "Accordion panels"
  },
  {
    label: "Icon",
    path: "/template/icon",
    icon: <AutoAwesomeIcon fontSize="large" />,
    desc: "Material Symbols + MUI SVG icons"
  },
  {
    label: "Color & Size",
    path: "/template/color-size",
    icon: <PaletteIcon fontSize="large" />,
    desc: "Color palette, spacing, radius"
  },
  {
    label: "Preset Token",
    path: "/template/preset",
    icon: <TuneIcon fontSize="large" />,
    desc: "Spacing, color, bgcolor presets"
  },
  {
    label: "Select",
    path: "/template/select",
    icon: <ArrowDropDownCircleIcon fontSize="large" />,
    desc: "Select, MenuItem"
  },
  {
    label: "List",
    path: "/template/list",
    icon: <ListIcon fontSize="large" />,
    desc: "List, ListItem, Collapse"
  },
  {
    label: "Drawer",
    path: "/template/drawer",
    icon: <MenuOpenIcon fontSize="large" />,
    desc: "Drawer (temporary, persistent)"
  },
  {
    label: "Dialog",
    path: "/template/dialog",
    icon: <WebAssetOffIcon fontSize="large" />,
    desc: "Dialog, DialogTitle, Content, Actions"
  },
  {
    label: "Surface",
    path: "/template/surface",
    icon: <LayersIcon fontSize="large" />,
    desc: "Paper, Divider, CardActionArea"
  },
  {
    label: "Form",
    path: "/template/form",
    icon: <DynamicFormIcon fontSize="large" />,
    desc: "Form, InputAdornment"
  },
  {
    label: "Media",
    path: "/template/media",
    icon: <PermMediaIcon fontSize="large" />,
    desc: "Link, Img"
  },
  {
    label: "AppBar",
    path: "/template/appbar",
    icon: <WebIcon fontSize="large" />,
    desc: "AppBar, Toolbar"
  },
  {
    label: "Snackbar",
    path: "/template/snackbar",
    icon: <AnnouncementIcon fontSize="large" />,
    desc: "Snackbar positions, actions"
  },
  {
    label: "Navigation",
    path: "/template/navigation",
    icon: <NavigationIcon fontSize="large" />,
    desc: "AppHeader, Sidebar, NavList"
  },
  {
    label: "Domain",
    path: "/template/domain",
    icon: <StorefrontIcon fontSize="large" />,
    desc: "PricingCard, ContactBar"
  },
  {
    label: "Chip",
    path: "/template/chip",
    icon: <LabelIcon fontSize="large" />,
    desc: "Chip variants, colors, deletable"
  },
  {
    label: "Checkbox",
    path: "/template/checkbox",
    icon: <CheckBoxIcon fontSize="large" />,
    desc: "Checkbox, FormControlLabel"
  },
  {
    label: "FormField",
    path: "/template/form-field",
    icon: <ViewStreamIcon fontSize="large" />,
    desc: "Label + Input + Error composite"
  },
  {
    label: "Radio",
    path: "/template/radio",
    icon: <RadioButtonCheckedIcon fontSize="large" />,
    desc: "Radio, RadioGroup, FormControlLabel"
  }
];

export function TemplatePage() {
  const navigate = useNavigate();

  return (
    <Box className="ok-template-page">
      <Typography variant="h4" mb={3}>
        Component Templates
      </Typography>

      <Grid container spacing={2}>
        {TEMPLATES.map((t) => (
          <Grid key={t.path} size={{ xs: 12, sm: 6, md: 4 }}>
            <TemplateCard
              icon={t.icon}
              label={t.label}
              desc={t.desc}
              onClick={() => navigate(t.path)}
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
