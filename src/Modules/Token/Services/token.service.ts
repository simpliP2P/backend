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
import { Logger } from "@nestjs/common";

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    @InjectRepository(Token)
    private tokenRepository: Repository<Token>,
  ) {}

  async createToken(
    userId: string,
    type: TokenType,
    mins?: number,
    metaData?: any,
  ): Promise<string> {
    try {
      // Validate input
      if (!userId) {
        throw new Error("User ID is required for token creation");
      }
      if (!type) {
        throw new Error("Token type is required");
      }

      const token = crypto.randomBytes(40).toString("hex");
      const expirationMinutes = mins || 15;

      const tokenData = {
        token,
        type,
        expires_at: new Date(Date.now() + expirationMinutes * 60 * 1000),
        user_id: userId,
        meta_data: metaData || null,
      };

      this.logger.log(
        `Creating token for user ${userId}, type: ${type}, expires in ${expirationMinutes} minutes`,
      );
      this.logger.debug("Token data:", JSON.stringify(tokenData, null, 2));

      const savedToken = await this.save(tokenData);

      if (!savedToken || !savedToken.token) {
        throw new Error("Token save operation returned invalid result");
      }

      this.logger.log(
        `✅ Token created successfully: ${savedToken.token} for user: ${userId}`,
      );
      return savedToken.token;
    } catch (error) {
      this.logger.error(`❌ Token creation failed for user ${userId}:`, error);
      throw new Error(`Token creation failed: ${error.message}`);
    }
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

    const IsResourceToken = type === TokenType.RESOURCE_TOKEN;
    if (!IsResourceToken && expiresAt < now) {
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
