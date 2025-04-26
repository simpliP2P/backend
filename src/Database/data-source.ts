import { DataSource } from "typeorm";
import * as AppConfig from "../Config/app.config";
import * as dotenv from "dotenv";
import { join } from "path";
import { AuditSubscriber } from "src/Subscribers/audit-logs.subscriber";

dotenv.config();
const dbConfig = AppConfig.default().database;
const entityPath = join(__dirname + "/../Modules/**/**/*.entity{.ts,.js}");
const inProd = AppConfig.default().isAppInProduction;

export const AppDataSource = new DataSource({
  type: "postgres",
  host: dbConfig.host,
  port: dbConfig.port,
  username: dbConfig.username,
  password: dbConfig.password,
  database: dbConfig.name,
  entities: [entityPath],
  migrations: ["dist/Database/migrations/*.js"],
  subscribers: [AuditSubscriber],
  synchronize: true, // set to false when in production
  ssl: {
    rejectUnauthorized: inProd,
  },
});
