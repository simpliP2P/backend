import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";
import { CommentEntityType } from "../Enums/comment.enum";

export class CreateCommentDto {
  @IsUUID()
  @IsOptional()
  @IsNotEmpty()
  organisation_id: string;

  @IsEnum(CommentEntityType)
  @IsNotEmpty()
  entity_type: CommentEntityType;

  @IsUUID()
  entity_id: string;

  @IsString()
  @IsNotEmpty()
  text: string;

  @IsUUID()
  @IsOptional()
  created_by: string;
}
