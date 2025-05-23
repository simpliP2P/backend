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
    max: 20, // Set max connections in pool to 20
  },
});
