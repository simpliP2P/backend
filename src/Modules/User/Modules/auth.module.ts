import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { AuthController } from "../Controllers/auth.controller";
import { AuthService } from "../Services/auth.service";
import { User } from "../Entities/user.entity";
import { UserService } from "../Services/user.service";
import { MailModule } from "src/Modules/Mail/mail.module";
import { ClientHelper } from "src/Shared/Helpers/client.helper";
import { TokenModule } from "src/Modules/Token/token.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    JwtModule.register({}),
    MailModule,
    TokenModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, UserService, ClientHelper],
})
export class AuthModule {}
