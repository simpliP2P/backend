import { Module, NestModule } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { BullModule } from "@nestjs/bullmq"; // Import BullMQ
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
import { CommentModule } from "./Modules/Comments/Modules/comment.module";
import { PurchaseRequisitionModule } from "./Modules/PurchaseRequisition/Modules/purchase-requisition.module";
import { PurchaseItemModule } from "./Modules/PurchaseItem/Modules/purchase-item.module";
import { FileManagerModule } from "./Modules/FileManager/Modules/file-manager.module";
import { ExportModule } from "./Modules/ExportData/Modules/export.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      cache: true,
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>("REDIS_HOST", "127.0.0.1"),
          port: configService.get<number>("REDIS_PORT", 6379),
          password: configService.get<string>("REDIS_PASSWORD", ""),
        },
      }),
      inject: [ConfigService],
    }),
    DatabaseModule,
    AuthModule,
    OAuthModule,
    OrganisationModule,
    CommentModule,
    PurchaseRequisitionModule,
    PurchaseItemModule,
    FileManagerModule,
    ExportModule,
  ],
  controllers: [AppController],
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
