import { Injectable } from "@nestjs/common";
import { NotificationChannels } from "src/Modules/Supplier/Enums/supplier.enum";
import {
  INotificationOrchestrator,
  INotificationService,
  INotificationResult,
} from "../Interfaces/notification.interface";
import { NotificationFactoryService } from "../Factories/notification-factory.service";

/**
 * Notification Facade - Provides a simplified interface to the complex notification subsystem
 * Implements Facade Pattern to hide complexity and provide a unified interface
 */
@Injectable()
export class NotificationOrchestratorService
  implements INotificationOrchestrator
{
  constructor(
    private readonly notificationFactory: NotificationFactoryService,
  ) {}

  /**
   * Facade method for sending purchase order notifications
   * Abstracts the complexity of choosing the right notification channel
   */
  async sendPurchaseOrderNotification(
    channel: string,
    to: string,
    data: { organisationName: string; supplierName: string; poUrl: string },
  ) {
    const notificationStrategy = this.getNotificationStrategy(
      channel as NotificationChannels,
    );
    return await notificationStrategy.sendPurchaseOrderNotification(to, data);
  }

  /**
   * Facade method for sending invitation notifications
   */
  async sendInvitationNotification(
    channel: string,
    to: string,
    data: {
      organisationName: string;
      inviterName: string;
      invitationUrl: string;
    },
  ) {
    const notificationStrategy = this.getNotificationStrategy(
      channel as NotificationChannels,
    );
    return await notificationStrategy.sendInvitationNotification(to, data);
  }

  /**
   * Facade method for sending password reset notifications
   */
  async sendPasswordResetNotification(
    channel: string,
    to: string,
    data: { resetUrl: string; expiryTime: string; userName?: string },
  ) {
    const notificationStrategy = this.getNotificationStrategy(
      channel as NotificationChannels,
    );
    return await notificationStrategy.sendPasswordResetNotification(to, data);
  }

  /**
   * Facade method for sending generic messages
   */
  async sendGenericMessage(channel: string, to: string, message: string) {
    const notificationStrategy = this.getNotificationStrategy(
      channel as NotificationChannels,
    );
    return await notificationStrategy.sendGenericMessage(to, message);
  }

  /**
   * WhatsApp-specific facade methods
   */
  async sendWhatsAppMessageWithMedia(
    to: string,
    message: string,
    mediaUrl: string,
  ) {
    const whatsAppService = this.notificationFactory.createNotificationService(
      NotificationChannels.WhatsApp,
    );
    return await (whatsAppService as any).sendMessageWithMedia(
      to,
      message,
      mediaUrl,
    );
  }

  async sendWhatsAppTemplate(
    to: string,
    templateName: string,
    language: string = "en",
    variables?: Record<string, string>,
  ) {
    const whatsAppService = this.notificationFactory.createNotificationService(
      NotificationChannels.WhatsApp,
    );
    return await (whatsAppService as any).sendTemplateMessage(
      to,
      templateName,
      language,
      variables,
    );
  }

  /**
   * Email-specific facade methods
   */
  async sendEmail(
    to: string,
    subject: string,
    template: string,
    variables?: Record<string, any>,
  ) {
    const emailService = this.notificationFactory.createNotificationService(
      NotificationChannels.Email,
    );
    return await (emailService as any).sendGenericEmail(
      to,
      subject,
      template,
      variables,
    );
  }

  async sendWelcomeEmail(
    to: string,
    data: { userName: string; organisationName?: string },
  ) {
    const emailService = this.notificationFactory.createNotificationService(
      NotificationChannels.Email,
    );
    return await (emailService as any).sendWelcomeEmail(to, data);
  }

  async sendBulkEmail(
    recipients: string[],
    subject: string,
    template: string,
    variables?: Record<string, any>,
  ) {
    const emailService = this.notificationFactory.createNotificationService(
      NotificationChannels.Email,
    );
    return await (emailService as any).sendBulkEmail(
      recipients,
      subject,
      template,
      variables,
    );
  }

  /**
   * Multi-channel notification facade
   * Implements Strategy Pattern for handling multiple channels
   */
  async sendMultiChannelNotification(
    channels: string[],
    to: string,
    notificationType: string,
    data: any,
  ): Promise<INotificationResult[]> {
    const results: INotificationResult[] = [];

    for (const channel of channels) {
      try {
        const notificationStrategy = this.getNotificationStrategy(
          channel as NotificationChannels,
        );
        const result = await this.executeNotificationStrategy(
          notificationStrategy,
          notificationType,
          to,
          data,
        );
        results.push({ channel, success: true, result });
      } catch (error) {
        results.push({ channel, success: false, error: error.message });
      }
    }

    return results;
  }

  /**
   * Get available notification channels
   */
  getAvailableChannels(): string[] {
    return this.notificationFactory.getSupportedChannels();
  }

  /**
   * Check if a channel is supported
   */
  isChannelSupported(channel: string): boolean {
    return this.notificationFactory.isChannelSupported(channel);
  }

  /**
   * Private method implementing Strategy Pattern
   * Returns the appropriate notification strategy based on channel
   */
  private getNotificationStrategy(
    channel: NotificationChannels,
  ): INotificationService {
    return this.notificationFactory.createNotificationService(channel);
  }

  /**
   * Private method to execute notification strategy
   * Implements Template Method Pattern
   */
  private async executeNotificationStrategy(
    strategy: INotificationService,
    notificationType: string,
    to: string,
    data: any,
  ) {
    switch (notificationType) {
      case "purchaseOrder":
        return await strategy.sendPurchaseOrderNotification(to, data);
      case "invitation":
        return await strategy.sendInvitationNotification(to, data);
      case "passwordReset":
        return await strategy.sendPasswordResetNotification(to, data);
      case "generic":
        return await strategy.sendGenericMessage(to, data.message);
      default:
        throw new Error(`Unsupported notification type: ${notificationType}`);
    }
  }
}
