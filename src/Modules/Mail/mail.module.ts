import { Module } from "@nestjs/common";
import BrevoEmailService from "src/Infrastructure/Notification/brevo-mail";
import { AppLogger } from "src/Logger/logger.service";
import { EmailServices } from "./Services/mail.service";

@Module({
  providers: [BrevoEmailService, AppLogger, EmailServices],
  exports: [EmailServices], // Export EmailServices so it can be used in other modules
})
export class MailModule {}
