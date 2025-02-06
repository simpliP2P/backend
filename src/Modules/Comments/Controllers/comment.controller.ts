import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Req,
  SetMetadata,
  UseGuards,
} from "@nestjs/common";
import { CommentService } from "../Services/comment.service";
import { CreateCommentDto } from "../Dtos/comment.dto";
import { BadRequestException } from "src/Shared/Exceptions/app.exceptions";
import { Request } from "express";
import { PermissionType } from "src/Modules/Organisation/Enums/user-organisation.enum";
import { OrganisationPermissionsGuard } from "src/Guards/permissions.guard";

@Controller("comments")
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  // @Post()
  //  @SetMetadata("permissions", [
  //     PermissionType.ORG_MEMBER
  //   ])
  //   @UseGuards(OrganisationPermissionsGuard)
  async create(
    @Body() createCommentDto: CreateCommentDto,
    @Req() req: Request,
  ) {
    try { 
      const userId = req.user.sub;
      const organisationId = req.headers["oid"] as string;

      if (!userId || !organisationId) return;

      const comment = await this.commentService.create({
        ...createCommentDto,
        organisation_id: organisationId,
        created_by: userId,
      });

      return {
        status: "success",
        message: "Comment created successfully",
        data: { comment },
      };
    } catch (error) {
      throw error;
    }
  }

  @Get("entities/:entityId")
  async findAll(
    @Param("entityId") entityId: string,
    @Req() req: Request,
  ) {
    const organisationId = req.headers["oid"] as string;

    if (!organisationId || !entityId) {
      throw new BadRequestException("Missing required query parameters");
    }

    return await this.commentService.findAll(organisationId, entityId);
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.commentService.findOne(id);
  }

  @Delete(":id")
  async remove(@Param("id") id: string) {
    return this.commentService.remove(id);
  }
}
