import { Module } from "@nestjs/common";
import { UserService } from "../Services/user.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "../Entities/user.entity";
import { UserController } from "../Controllers/user.controller";
import { FileManagerModule } from "src/Modules/FileManager/Modules/file-manager.module";
import { AppLogger } from "src/Logger/logger.service";
import { TokenModule } from "src/Modules/Token/token.module";

@Module({
  imports: [TypeOrmModule.forFeature([User]), FileManagerModule, TokenModule],
  controllers: [UserController],
  providers: [UserService, AppLogger],
  exports: [UserService],
})
export class UserModule {}
