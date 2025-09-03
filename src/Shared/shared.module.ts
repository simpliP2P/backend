import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ClientHelper } from "./Helpers/client.helper";

@Module({
  imports: [ConfigModule],
  providers: [ClientHelper],
  exports: [ClientHelper, ConfigModule],
})
export class SharedModule {}
