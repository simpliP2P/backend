import { Module, NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthModule } from "./Modules/User/Modules/auth.module";
import configuration from "./Config/app.config";
import { DatabaseModule } from "./Database/modules/database.module";
import { MiddlewareConsumer } from "@nestjs/common/interfaces";
import { RequestLoggerMiddleware } from "./Middleware/request-logger.middleware";
import { AppLogger } from "./Logger/logger.service";
import { OAuthModule } from "./Modules/Oauth/oauth.module";
import { CloudinaryConfig } from "./Config/cloudinaryClient.config";
import { OrganisationModule } from "./Modules/Organisation/Modules/organisation.module";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { RequestContextInterceptor } from "./Interceptors/request-context.interceptor";

@Module({
  // Declares external modules that this module depends on
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      cache: true,
    }),
    DatabaseModule,
    AuthModule,
    OAuthModule,
    OrganisationModule,
  ],
  // Defines the controllers for this module.
  controllers: [AppController],
  // Declares the services that are available in this module
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestContextInterceptor,
    },
    AppService,
    AppLogger,
    CloudinaryConfig,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes("*");
  }
}