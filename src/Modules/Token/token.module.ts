import { Module } from "@nestjs/common";
import { TokenHelper } from "src/Shared/Helpers/token.helper";
import { Token } from "./Entities/token.entity";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TokenService } from "./Services/token.service";
import { JwtModule } from "@nestjs/jwt";
import { AppLogger } from "src/Logger/logger.service";

@Module({
  imports: [TypeOrmModule.forFeature([Token]), JwtModule.register({})],
  controllers: [],
  providers: [TokenHelper, TokenService, AppLogger],
  exports: [TokenHelper, TokenService],
})
export class TokenModule {}
