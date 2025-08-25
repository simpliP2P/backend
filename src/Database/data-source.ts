import { DataSource } from "typeorm";
import * as AppConfig from "../Config/app.config";
import * as dotenv from "dotenv";
import { join } from "path";

dotenv.config();
const dbConfig = AppConfig.default().database;
const entityPath = join(__dirname + "/../Modules/**/**/*.entity{.ts,.js}");
const subscriberPath = join(
  __dirname + "/../Modules/**/**/*.subscriber{.ts,.js}",
);
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
  subscribers: [subscriberPath],
  synchronize: false,
  ssl: {
    rejectUnauthorized: inProd,
  },
  extra: {
    max: 20,
    min: 5,
    acquireTimeoutMillis: 30000,
    createTimeoutMillis: 30000,
    destroyTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 200,
  },
  poolSize: 20,
});
