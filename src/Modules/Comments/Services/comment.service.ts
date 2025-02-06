// comment.service.ts
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Comment } from "../Entities/comment.entity";
import { CreateCommentDto } from "../Dtos/comment.dto";
import { User } from "src/Modules/User/Entities/user.entity";
import { Organisation } from "src/Modules/Organisation/Entities/organisation.entity";

@Injectable()
export class CommentService {
  constructor(
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
  ) {}

  async create(
    createCommentDto: CreateCommentDto,
  ): Promise<Comment> {
    const comment = this.commentRepository.create({
      ...createCommentDto,
      created_by: { id: createCommentDto.created_by } as User,
      organisation: { id: createCommentDto.organisation_id } as Organisation,
    });
    return await this.commentRepository.save(comment);
  }

  async findAll(organisationId: string, entityId: string): Promise<Comment[]> {
    return await this.commentRepository.find({
      where: {
        organisation: { id: organisationId },
        entity_id: entityId,
      },
      relations: ["created_by"],
      select: {
        created_by: {
          id: true,
          first_name: true,
          last_name: true,
        }
      }
    });
  }

  async findOne(id: string): Promise<Comment | null> {
    return await this.commentRepository.findOne({
      where: { id },
      relations: ["created_by"],
      select: {
        created_by: {
          id: true,
          first_name: true,
          last_name: true,
        },
      },
    });
  }

  async remove(id: string): Promise<void> {
    await this.commentRepository.delete(id);
  }
}
