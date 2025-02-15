import { TypeOrmModule } from "@nestjs/typeorm";
import { CommentController } from "../Controllers/comment.controller";
import { CommentService } from "../Services/comment.service";
import { Module } from "@nestjs/common";
import { Comment } from "../Entities/comment.entity";
import { UserOrganisation } from "src/Modules/Organisation/Entities/user-organisation.entity";
import { OrganisationModule } from "src/Modules/Organisation/Modules/organisation.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Comment, UserOrganisation]),
    OrganisationModule,
  ],
  providers: [CommentService],
  controllers: [CommentController],
  exports: [CommentService],
})
export class CommentModule {}
