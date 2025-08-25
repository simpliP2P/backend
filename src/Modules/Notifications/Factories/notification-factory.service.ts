import { Injectable } from "@nestjs/common";
import { SmsNotificationService } from "../Services/sms-notification.service";
import { WhatsAppNotificationService } from "../Services/whatsapp-notification.service";
import { EmailNotificationService } from "../Services/email-notification.service";
import { NotificationChannels } from "src/Modules/Supplier/Enums/supplier.enum";
import { INotificationService } from "../Interfaces/notification.interface";

/**
 * Notification Factory - Implements Factory Pattern
 * Creates appropriate notification services based on channel type
 */
@Injectable()
export class NotificationFactoryService {
  constructor(
    private readonly smsNotificationService: SmsNotificationService,
    private readonly whatsAppNotificationService: WhatsAppNotificationService,
    private readonly emailNotificationService: EmailNotificationService,
  ) {}

  /**
   * Factory method to create notification service based on channel
   * Implements Factory Pattern
   */
  createNotificationService(
    channel: NotificationChannels,
  ): INotificationService {
    switch (channel) {
      case NotificationChannels.SMS:
        return this.smsNotificationService;
      case NotificationChannels.WhatsApp:
        return this.whatsAppNotificationService;
      case NotificationChannels.Email:
        return this.emailNotificationService;
      default:
        throw new Error(`Unsupported notification channel: ${channel}`);
    }
  }

  /**
   * Factory method to create multiple notification services
   */
  createNotificationServices(
    channels: NotificationChannels[],
  ): INotificationService[] {
    return channels.map((channel) => this.createNotificationService(channel));
  }

  /**
   * Get all available notification services
   */
  getAllNotificationServices(): INotificationService[] {
    return [
      this.smsNotificationService,
      this.whatsAppNotificationService,
      this.emailNotificationService,
    ];
  }

  /**
   * Check if a channel is supported by the factory
   */
  isChannelSupported(channel: string): channel is NotificationChannels {
    return Object.values(NotificationChannels).includes(
      channel as NotificationChannels,
    );
  }

  /**
   * Get supported channels
   */
  getSupportedChannels(): NotificationChannels[] {
    return Object.values(NotificationChannels);
  }
}
