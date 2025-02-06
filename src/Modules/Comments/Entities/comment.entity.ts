import { IsEnum } from "class-validator";
import { BaseEntity } from "src/Common/entities/base.entity";
import { User } from "src/Modules/User/Entities/user.entity";
import { Column, Entity, ManyToOne, JoinColumn } from "typeorm";
import { CommentEntityType } from "../Enums/comment.enum";
import { Organisation } from "src/Modules/Organisation/Entities/organisation.entity";

@Entity("comments")
export class Comment extends BaseEntity {
  @IsEnum(CommentEntityType)
  @Column()
  entity_type: CommentEntityType;

  @Column()
  entity_id: string; 

  @Column("text")
  text: string;

  @ManyToOne(() => Organisation)
  organisation: Organisation;

  @ManyToOne(() => User)
  @JoinColumn({ name: "created_by" })
  created_by: User;
}
