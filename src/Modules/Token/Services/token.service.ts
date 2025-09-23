import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Token } from "../Entities/token.entity";
import { TokenData, TokenType } from "../Enums/token.enum";
import {
  InvalidTokenException,
  TokenExpiredException,
} from "src/Shared/Exceptions/app.exceptions";
import * as crypto from "crypto";
import { AppLogger } from "src/Logger/logger.service";

@Injectable()
export class TokenService {
  constructor(
    @InjectRepository(Token)
    private tokenRepository: Repository<Token>,
    private readonly logger: AppLogger,
  ) {}

  async createToken(
    userId: string,
    type: TokenType,
    mins?: number,
    metaData?: any,
  ): Promise<string> {
    const token = crypto.randomBytes(40).toString("hex");

    const tokenData = {
      token,
      type,
      expires_at: new Date(Date.now() + (mins || 15) * 60 * 1000), // 15 minutes
      user_id: userId,
      meta_data: metaData || null,
    };

    const savedToken = await this.save(tokenData);
    return savedToken.token;
  }

  async verifyToken(token: string, type: TokenType): Promise<Token> {
    const storedToken = await this.tokenRepository.findOne({
      where: {
        token,
        type,
      },
      relations: ["user"],
    });

    if (!storedToken) {
      throw new InvalidTokenException();
    }

    const now = new Date();
    const expiresAt = new Date(storedToken.expires_at);

    if (expiresAt < now) {
      throw new TokenExpiredException();
    }

    return storedToken;
  }

  async findToken(query: any): Promise<Token | null> {
    return await this.tokenRepository.findOne(query);
  }

  async findRefreshtoken(oldRefreshToken: string): Promise<Token | null> {
    const now = new Date();
    const gracePeriod = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes ago

    return await this.tokenRepository
      .createQueryBuilder("token")
      .where("token.token = :token", { token: oldRefreshToken })
      .andWhere("token.type = :type", { type: TokenType.REFRESH_TOKEN })
      .andWhere("token.meta_data @> :metaData", { metaData: { used: false } }) // JSON containment
      .andWhere("token.expires_at > :now", { now: gracePeriod })
      .getOne();
  }

  async update(query: any, newData: any): Promise<void> {
    await this.tokenRepository.update(query, newData);
  }

  async save(tokenData: TokenData): Promise<Token> {
    return await this.tokenRepository.save(tokenData);
  }

  async delete(query: any): Promise<void> {
    await this.tokenRepository.delete(query);
  }
}
