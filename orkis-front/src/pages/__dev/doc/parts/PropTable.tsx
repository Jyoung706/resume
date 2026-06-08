// ============================================
// PropTable — Props API 테이블 렌더러
// ============================================

import { Typography, Paper, Box } from "@/components";

export interface PropDef {
  name: string;
  type: string;
  default?: string;
  required?: boolean;
  description: string;
}

interface PropTableProps {
  props: PropDef[];
}

export function PropTable({ props }: PropTableProps) {
  if (props.length === 0) return null;

  return (
    <Paper variant="outlined" rounded="sm" sx={{ overflow: "auto" }}>
      <Box
        component="table"
        sx={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "0.875rem",
          "& th, & td": {
            textAlign: "left",
            p: 1.5,
            borderBottom: "1px solid",
            borderColor: "divider",
            verticalAlign: "top",
          },
          "& th": {
            fontWeight: 600,
            bgcolor: "grey.50",
            whiteSpace: "nowrap",
          },
          "& tr:last-child td": {
            borderBottom: "none",
          },
        }}
      >
        <thead>
          <tr>
            <th>Prop</th>
            <th>Type</th>
            <th>Default</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {props.map((p) => (
            <tr key={p.name}>
              <td>
                <Box
                  component="code"
                  sx={{
                    color: "primary.main",
                    fontWeight: 600,
                    fontSize: "0.8125rem",
                  }}
                >
                  {p.name}
                  {p.required && (
                    <Typography
                      component="span"
                      color="error.main"
                      fontSize="inherit"
                    >
                      *
                    </Typography>
                  )}
                </Box>
              </td>
              <td>
                <Box
                  component="code"
                  sx={{
                    fontSize: "0.75rem",
                    color: "text.secondary",
                    bgcolor: "grey.100",
                    px: 0.5,
                    py: 0.25,
                    borderRadius: 0.5,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {p.type}
                </Box>
              </td>
              <td>
                {p.default ? (
                  <Box
                    component="code"
                    sx={{ fontSize: "0.75rem", color: "success.dark" }}
                  >
                    {p.default}
                  </Box>
                ) : (
                  <Typography variant="caption" color="text.disabled">
                    —
                  </Typography>
                )}
              </td>
              <td>
                <Typography variant="body2">{p.description}</Typography>
              </td>
            </tr>
          ))}
        </tbody>
      </Box>
    </Paper>
  );
}
