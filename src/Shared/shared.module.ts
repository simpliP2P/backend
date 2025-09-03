import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ClientHelper } from "./Helpers/client.helper";
import { PerformanceHelper } from "./Helpers/performance.helper";

@Module({
  imports: [ConfigModule],
  providers: [ClientHelper, PerformanceHelper],
  exports: [ClientHelper, ConfigModule, PerformanceHelper],
})
export class SharedModule {}
