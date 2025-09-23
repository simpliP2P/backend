import { Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { LessThan, Repository } from "typeorm";
import { Token } from "../Entities/token.entity";
import { AppLogger } from "src/Logger/logger.service";

@Injectable()
export class TokenCleanupService {
  constructor(
    @InjectRepository(Token)
    private tokenRepository: Repository<Token>,
    private readonly logger: AppLogger,
  ) {}

  @Cron(CronExpression.EVERY_WEEK)
  async cleanupExpiredTokens(): Promise<void> {
    try {
      this.logger.log("Starting weekly token cleanup...");

      const result = await this.tokenRepository.delete({
        expires_at: LessThan(new Date()),
      });

      this.logger.log(
        `Token cleanup completed. Deleted ${result.affected || 0} expired tokens.`,
      );
    } catch (error) {
      this.logger.error("Token cleanup failed:", error);
    }
  }
}
