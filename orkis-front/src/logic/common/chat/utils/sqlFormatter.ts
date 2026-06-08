import { format } from "sql-formatter";

export function formatSql(sql: string): string {
  try {
    return format(sql, {
      language: "sql",
      tabWidth: 2,
      useTabs: false,
      keywordCase: "upper",
      linesBetweenQueries: 2,
      indentStyle: "standard",
    });
  } catch {
    return sql;
  }
}
