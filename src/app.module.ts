import { Module, NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
// import { BullModule } from "@nestjs/bullmq"; // Import BullMQ
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
import { PurchaseOrderModule } from "./Modules/PurchaseOrder/Modules/purchase-order.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      cache: true,
    }),
    // BullModule.forRootAsync({
    //   imports: [ConfigModule],
    //   useFactory: async (configService: ConfigService) => ({
    //     connection: {
    //       host: configService.get<string>("redis.host"),
    //       port: configService.get<number>("redis.port"),
    //       password: configService.get<string>("redis.password"),
    //     },
    //   }),
    //   inject: [ConfigService],
    // }),
    DatabaseModule,
    AuthModule,
    OAuthModule,
    OrganisationModule,
    CommentModule,
    PurchaseRequisitionModule,
    PurchaseItemModule,
    FileManagerModule,
    ExportModule,
    PurchaseOrderModule,
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
