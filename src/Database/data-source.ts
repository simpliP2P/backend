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
    // Aggressive connection pooling for maximum performance
    max: 50, // Increased from 20
    min: 10, // Increased from 5
    acquireTimeoutMillis: 10000, // Reduced from 30000
    createTimeoutMillis: 10000, // Reduced from 30000
    destroyTimeoutMillis: 2000, // Reduced from 5000
    idleTimeoutMillis: 60000, // Increased from 30000
    reapIntervalMillis: 500, // Reduced from 1000
    createRetryIntervalMillis: 100, // Reduced from 200

    // PostgreSQL ultra-performance optimizations
    statement_timeout: 15000, // Reduced to 15 seconds
    query_timeout: 15000, // Reduced to 15 seconds
    plan_cache_mode: "auto", // Enable query plan caching
    application_name: "simplip2p-backend",
    prepare_cache_size: 200, // Increased from 100
    work_mem: "8MB", // Increased from 4MB

    // Connection-level performance settings
    tcp_keepalives_idle: 300, // TCP keepalive
    tcp_keepalives_interval: 10, // TCP keepalive interval
    tcp_keepalives_count: 6, // TCP keepalive count

    // Query optimization flags
    enable_seqscan: false, // Disable sequential scans
    enable_indexscan: true, // Enable index scans
    enable_bitmapscan: true, // Enable bitmap scans
    enable_hashjoin: true, // Enable hash joins
    enable_mergejoin: true, // Enable merge joins
    enable_nestloop: true, // Enable nested loops
  },
  poolSize: 50, // Increased from 20
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
