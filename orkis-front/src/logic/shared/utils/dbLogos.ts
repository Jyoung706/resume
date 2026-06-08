// ============================================
// DB 타입 로고 경로 유틸리티
// 확장자가 혼재(svg, png, gif)된 아이콘 파일을 안전하게 참조
// ============================================

const DB_TYPE_LOGOS: Record<string, string> = {
  postgresql: "/assets/db-icon/postgresql.png",
  mysql: "/assets/db-icon/mysql.png",
  mariadb: "/assets/db-icon/mariadb.svg",
  mssql: "/assets/db-icon/mssql.svg",
  oracle: "/assets/db-icon/oracle.svg",
  sqlite: "/assets/db-icon/sqlite.gif",
  mongodb: "/assets/db-icon/mongodb.svg",
  redis: "/assets/db-icon/redis.svg",
  cassandra: "/assets/db-icon/cassandra.svg",
  dynamodb: "/assets/db-icon/dynamodb.svg",
  firebase: "/assets/db-icon/firebase.svg",
  elasticsearch: "/assets/db-icon/elasticsearch.svg",
  neo4j: "/assets/db-icon/neo4j.svg",
  influxdb: "/assets/db-icon/influxdb.svg",
};

export const DEFAULT_DB_LOGO = "/assets/icons/action/db_normal.png";

/** DB 타입명으로 로고 경로 반환 (없으면 기본 아이콘) */
export function getDbLogo(typeName: string | undefined): string {
  if (!typeName) return DEFAULT_DB_LOGO;
  return DB_TYPE_LOGOS[typeName.toLowerCase()] ?? DEFAULT_DB_LOGO;
}
