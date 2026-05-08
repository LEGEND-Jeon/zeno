import path from "node:path";
import { defineConfig } from "prisma/config";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const dbUrl = `file:${path.join(process.cwd(), "dev.db")}`;

export default defineConfig({
  earlyAccess: true,
  schema: "./prisma/schema.prisma",
  datasource: {
    url: dbUrl,
  },
  migrate: {
    adapter: new PrismaLibSql({ url: dbUrl }),
  },
});
