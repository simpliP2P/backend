import { NestFactory } from "@nestjs/core";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { AppExceptionFilter } from "./Shared/Filters/exception.filter";
import { AppLogger } from "./Logger/logger.service";
import { ConfigService } from "@nestjs/config";
import { DataSource } from "typeorm";
import { ValidationPipe } from "@nestjs/common";
import { ValidationExceptionFilter } from "./Shared/Filters/validation-exception.filter";
import { AuthGuard } from "./Guards/auth.guard";
import { Reflector } from "@nestjs/core";
import { TokenHelper } from "./Shared/Helpers/token.helper";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Get services from the application context
  const logger = app.get(AppLogger);
  const configService = app.get(ConfigService);
  const dataSource = app.get(DataSource);

  // Set the logger as the application's logger
  app.useLogger(logger);

  const config = new DocumentBuilder()
    .setTitle("Simplip2p")
    .setDescription("The simplip2p API documentation")
    .setVersion("1.0")
    .addTag("procurement")
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api", app, document);

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
    allowedHeaders: "Content-Type, Accept, Authorization",
    credentials: true,
  });
  
  const reflector = app.get(Reflector);
  const tokenHelper = app.get(TokenHelper);
  app.useGlobalGuards(new AuthGuard(reflector, tokenHelper));
  
  app.useGlobalFilters(
    new AppExceptionFilter(),
    new ValidationExceptionFilter(),
  );
  // Enable global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Removes properties that are not defined in the DTO
      forbidNonWhitelisted: true, // Throws an error if unknown properties are provided
      transform: true, // Automatically transforms payloads to match the DTO
    }))

  const port = configService.get<number>("port") || 3000;
  await app.listen(port);
  logger.log(`Application is running on PORT: ${port}`);
}

bootstrap();
