import { Module } from "@nestjs/common";
import { NotificationOrchestratorService } from "./Services/notification-orchestrator.service";
import { NotificationFactoryService } from "./Factories/notification-factory.service";
import { SmsNotificationService } from "./Services/sms-notification.service";
import { WhatsAppNotificationService } from "./Services/whatsapp-notification.service";
import { EmailNotificationService } from "./Services/email-notification.service";
import { TwilioSmsService } from "src/Infrastructure/Notification/twilio-sms";
import { TwilioWhatsAppService } from "src/Infrastructure/Notification/twilio-whatsapp";
import { BrevoEmailService } from "src/Infrastructure/Notification/brevo-mail";

/**
 * Notifications Module - Implements Clean Architecture principles
 *
 * This module follows several OOP design patterns:
 * - Facade Pattern: NotificationOrchestratorService provides a simplified interface
 * - Factory Pattern: NotificationFactoryService creates appropriate services
 * - Strategy Pattern: Different notification strategies for different channels
 * - Interface Segregation: Each service implements specific interfaces
 * - Dependency Inversion: Depends on abstractions, not concrete implementations
 */
@Module({
  providers: [
    // Core services implementing interfaces
    SmsNotificationService,
    WhatsAppNotificationService,
    EmailNotificationService,

    // Factory service for creating notification services
    NotificationFactoryService,

    // Facade service that provides unified interface
    NotificationOrchestratorService,

    // Infrastructure services (external dependencies)
    TwilioSmsService,
    TwilioWhatsAppService,
    BrevoEmailService,
  ],
  exports: [
    // Only export the facade - other modules should use this
    NotificationOrchestratorService,
  ],
})
export class NotificationsModule {}
