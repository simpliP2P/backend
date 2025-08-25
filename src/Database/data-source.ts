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
    // PostgreSQL query caching and performance optimizations
    statement_timeout: 30000, // 30 seconds
    query_timeout: 30000,
    // Enable query plan caching
    plan_cache_mode: "auto",
    // Connection-level settings for better caching
    application_name: "simplip2p-backend",
    // Enable prepared statement caching
    prepare_cache_size: 100,
    // Set work_mem for better query performance
    work_mem: "4MB",
    // Enable shared_preload_libraries for pg_stat_statements
    shared_preload_libraries: "pg_stat_statements",
  },
  poolSize: 20,
  // // Enable query result caching
  // cache: {
  //   duration: 300000, // 5 minutes
  //   type: "redis",
  //   options: {
  //     host: process.env.REDIS_HOST,
  //     port: parseInt(process.env.REDIS_PORT || "6379"),
  //     password: process.env.REDIS_PASSWORD,
  //   },
  // },
});
