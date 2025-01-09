import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { LessThan, MoreThan, MoreThanOrEqual, Repository } from "typeorm";
import { Token } from "../Entities/token.entity";
import { TokenData, TokenType } from "../Enums/token.enum";
import {
  InvalidTokenException,
} from "src/Shared/Exceptions/app.exceptions";
import * as bcrypt from "bcrypt";
import * as crypto from "crypto";

@Injectable()
export class TokenService {
  constructor(
    @InjectRepository(Token)
    private tokenRepository: Repository<Token>,
  ) {}

  async createToken(
    userId: string,
    type: TokenType,
    mins?: number,
  ): Promise<string> {
    const token = crypto.randomBytes(32).toString("hex");

    const tokenData = {
      token,
      type,
      expires_at: new Date(Date.now() + (mins || 15) * 60 * 1000), // 15 minutes
      user_id: userId,
    };

    await this.save(tokenData);

    return token;
  }

  async verifyToken(token: string, type: TokenType): Promise<Token> {
    const storedToken = await this.tokenRepository.findOne({
      where: {
        token,
        type,
        expires_at: MoreThanOrEqual(new Date()),
      },
      relations: ["user"],
    });

    if (!storedToken) {
      throw new InvalidTokenException();
    }

    // Fire and forget cleanup
    this.tokenRepository
      .delete({
        expires_at: LessThan(new Date()),
      })
      .catch((err) => {
        console.error("Token cleanup failed:", err);
      });

    return storedToken;
  }

  async save(tokenData: TokenData): Promise<any> {
    return await this.tokenRepository.save(tokenData);
  }

  async delete(tokenId: number): Promise<void> {
    await this.tokenRepository.delete(tokenId);
  }
}
