/**
 * Base interface for all notification services
 * Implements Interface Segregation Principle
 */
export interface INotificationService {
  sendPurchaseOrderNotification(
    to: string,
    data: { organisationName: string; supplierName: string; poUrl: string },
  ): Promise<any>;

  sendInvitationNotification(
    to: string,
    data: {
      organisationName: string;
      inviterName: string;
      invitationUrl: string;
    },
  ): Promise<any>;

  sendPasswordResetNotification(
    to: string,
    data: { resetUrl: string; expiryTime: string; userName?: string },
  ): Promise<any>;

  sendGenericMessage(to: string, message: string): Promise<any>;
}

/**
 * Interface for media-capable notification services
 * Extends base interface with media functionality
 */
export interface IMediaNotificationService extends INotificationService {
  sendMessageWithMedia(
    to: string,
    message: string,
    mediaUrl: string,
  ): Promise<any>;

  sendTemplateMessage(
    to: string,
    templateName: string,
    language?: string,
    variables?: Record<string, string>,
  ): Promise<any>;
}

/**
 * Interface for template-capable notification services
 * Extends base interface with template functionality
 */
export interface ITemplateNotificationService extends INotificationService {
  sendGenericEmail(
    to: string,
    subject: string,
    template: string,
    variables?: Record<string, any>,
  ): Promise<any>;

  sendBulkEmail(
    recipients: string[],
    subject: string,
    template: string,
    variables?: Record<string, any>,
  ): Promise<any>;
}

/**
 * Interface for the notification orchestrator
 * Implements Facade Pattern interface
 */
export interface INotificationOrchestrator {
  sendPurchaseOrderNotification(
    channel: string,
    to: string,
    data: { organisationName: string; supplierName: string; poUrl: string },
  ): Promise<any>;

  sendInvitationNotification(
    channel: string,
    to: string,
    data: {
      organisationName: string;
      inviterName: string;
      invitationUrl: string;
    },
  ): Promise<any>;

  sendPasswordResetNotification(
    channel: string,
    to: string,
    data: { resetUrl: string; expiryTime: string; userName?: string },
  ): Promise<any>;

  sendGenericMessage(
    channel: string,
    to: string,
    message: string,
  ): Promise<any>;

  sendMultiChannelNotification(
    channels: string[],
    to: string,
    notificationType: string,
    data: any,
  ): Promise<any[]>;

  getAvailableChannels(): string[];
  isChannelSupported(channel: string): boolean;
}

/**
 * Notification data types for type safety
 */
export interface IPurchaseOrderNotificationData {
  organisationName: string;
  supplierName: string;
  poUrl: string;
}

export interface IInvitationNotificationData {
  organisationName: string;
  inviterName: string;
  invitationUrl: string;
}

export interface IPasswordResetNotificationData {
  resetUrl: string;
  expiryTime: string;
  userName?: string;
}

/**
 * Result type for multi-channel notifications
 */
export interface INotificationResult {
  channel: string;
  success: boolean;
  result?: any;
  error?: string;
}
