import { NestFactory, Reflector } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DataSource } from "typeorm";
import { AppModule } from "./app.module";
import { AppLogger } from "./Logger/logger.service";
import { AuthGuard } from "./Guards/auth.guard";
import { TokenHelper } from "./Shared/Helpers/token.helper";
import { GlobalExceptionFilter } from "./Shared/Filters/global-exception.filter";
import * as helmet from "helmet";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Get services from the application context
  const logger = app.get(AppLogger);
  const configService = app.get(ConfigService);
  const dataSource = app.get(DataSource);

  // Set the logger as the application's logger
  app.useLogger(logger);

  // Database connection status
  const dbConnSuccess = "Successfully connected to the database";
  try {
    if (dataSource.isInitialized) {
      logger.log(dbConnSuccess);
    } else {
      await dataSource.initialize();
      logger.log(dbConnSuccess);
    }
  } catch (error) {
    logger.error(`Failed to connect to the database: ${error.message}`, "");
    process.exit(1); // Exit app if database connection fails
  }

  app.enableCors({
    origin: "*",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    allowedHeaders: [
      "Origin",
      "Referer",
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Access-Control-Allow-Origin",
      "Access-Control-Allow-Headers",
      "Access-Control-Allow-Methods",
      "Access-Control-Allow-Credentials",
      "Oid",
      "X-Resource-Token",
      "X-Timestamp",
      "X-Signature",
    ],
    credentials: true,
    maxAge: 86400,
  });

  app.use(helmet.default());

  const reflector = app.get(Reflector);
  const tokenHelper = app.get(TokenHelper);

  app.useGlobalGuards(new AuthGuard(reflector, tokenHelper));
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Removes properties that are not defined in the DTO
      forbidNonWhitelisted: true, // Throws an error if unknown properties are provided
      transform: true, // Automatically transforms payloads to match the DTO
    }),
  );

  // Enable graceful shutdown
  app.enableShutdownHooks();

  const port = configService.getOrThrow<number>("port") || 3000;
  await app.listen(port);
  logger.log(`Application is running on PORT: ${port}`);

  // Handle SIGTERM
  process.on("SIGTERM", async () => {
    console.log("SIGTERM received, closing server gracefully...");
    await app.close();
  });
}

bootstrap();
