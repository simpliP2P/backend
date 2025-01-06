import { Module } from "@nestjs/common";
import { UserService } from "../Services/user.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "../Entities/user.entity";
import { UserController } from "../Controllers/user.controller";
import { UploadModule } from "src/Modules/Upload/upload.module";

@Module({
  imports: [TypeOrmModule.forFeature([User]), UploadModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
