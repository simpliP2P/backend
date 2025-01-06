import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Token } from "../Entities/token.entity";
import { TokenType } from "../Enums/token.enum";
import {
  InvalidTokenException,
  TokenExpiredException,
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
    const hashedToken = await bcrypt.hash(token, 10);

    await this.tokenRepository.save({
      hashedToken,
      type,
      expiresAt: new Date(Date.now() + (mins || 15) * 60 * 1000), // 15 minutes
      userId,
    });

    return token;
  }

  async verifyToken(token: string, type: TokenType): Promise<Token> {
    const tokens = await this.tokenRepository.find({
      where: { type },
      relations: ["user"],
    });

    for (const storedToken of tokens) {
      const isValid = await bcrypt.compare(token, storedToken.hashedToken);
      if (isValid) {
        if (new Date() > storedToken.expiresAt) {
          throw new TokenExpiredException();
        }
        return storedToken;
      }
    }
    throw new InvalidTokenException();
  }

  async delete(tokenId: number): Promise<void> {
    await this.tokenRepository.delete(tokenId);
  }
}
