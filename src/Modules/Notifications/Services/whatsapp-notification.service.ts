import { Injectable } from "@nestjs/common";
import { TwilioWhatsAppService } from "src/Infrastructure/Notification/twilio-whatsapp";
import { IMediaNotificationService } from "../Interfaces/notification.interface";

@Injectable()
export class WhatsAppNotificationService implements IMediaNotificationService {
  constructor(private readonly twilioWhatsAppService: TwilioWhatsAppService) {}

  async sendPurchaseOrderNotification(
    to: string,
    data: { organisationName: string; supplierName: string; poUrl: string },
  ) {
    try {
      const body = `Hi ${data.supplierName}, You have a new purchase order from ${data.organisationName}. Click here to view: ${data.poUrl}`;

      const response = await this.twilioWhatsAppService.sendWhatsAppMessage(
        to,
        body,
      );
      return response;
    } catch (error) {
      throw new Error(`Failed to send WhatsApp notification: ${error.message}`);
    }
  }

  async sendGenericMessage(to: string, message: string) {
    try {
      const response = await this.twilioWhatsAppService.sendWhatsAppMessage(
        to,
        message,
      );
      return response;
    } catch (error) {
      throw new Error(`Failed to send WhatsApp message: ${error.message}`);
    }
  }

  async sendMessageWithMedia(to: string, message: string, mediaUrl: string) {
    try {
      const response =
        await this.twilioWhatsAppService.sendWhatsAppMessageWithMedia(
          to,
          message,
          mediaUrl,
        );
      return response;
    } catch (error) {
      throw new Error(
        `Failed to send WhatsApp message with media: ${error.message}`,
      );
    }
  }

  async sendTemplateMessage(
    to: string,
    templateName: string,
    language?: string,
    variables?: Record<string, string>,
  ) {
    try {
      const response = await this.twilioWhatsAppService.sendWhatsAppTemplate(
        to,
        templateName,
        language ?? "en", // Provide a default language, e.g., "en"
        variables,
      );
      return response;
    } catch (error) {
      throw new Error(`Failed to send WhatsApp template: ${error.message}`);
    }
  }

  async sendInvitationNotification(
    to: string,
    data: {
      organisationName: string;
      inviterName: string;
      invitationUrl: string;
    },
  ) {
    try {
      const body = `Hi! You've been invited to join ${data.organisationName} by ${data.inviterName}. Click here to accept: ${data.invitationUrl}`;

      const response = await this.twilioWhatsAppService.sendWhatsAppMessage(
        to,
        body,
      );
      return response;
    } catch (error) {
      throw new Error(`Failed to send invitation WhatsApp: ${error.message}`);
    }
  }

  async sendPasswordResetNotification(
    to: string,
    data: { resetUrl: string; expiryTime: string },
  ) {
    try {
      const body = `Your password reset link: ${data.resetUrl}. This link expires in ${data.expiryTime}.`;

      const response = await this.twilioWhatsAppService.sendWhatsAppMessage(
        to,
        body,
      );
      return response;
    } catch (error) {
      throw new Error(
        `Failed to send password reset WhatsApp: ${error.message}`,
      );
    }
  }
}
