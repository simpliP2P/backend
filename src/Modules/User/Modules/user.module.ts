import { Module } from "@nestjs/common";
import { UserService } from "../Services/user.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "../Entities/user.entity";

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
