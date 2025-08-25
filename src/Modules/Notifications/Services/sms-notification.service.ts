import { Injectable } from "@nestjs/common";
import { TwilioSmsService } from "src/Infrastructure/Notification/twilio-sms";
import { INotificationService } from "../Interfaces/notification.interface";

@Injectable()
export class SmsNotificationService implements INotificationService {
  constructor(private readonly twilioSmsService: TwilioSmsService) {}

  async sendPurchaseOrderNotification(
    to: string,
    data: { organisationName: string; supplierName: string; poUrl: string },
  ) {
    try {
      const body = `Hi ${data.supplierName}, You have a new purchase order from ${data.organisationName}. Click here to view: ${data.poUrl}`;

      const response = await this.twilioSmsService.sendSms(to, body);
      return response;
    } catch (error) {
      throw new Error(`Failed to send SMS notification: ${error.message}`);
    }
  }

  async sendGenericMessage(to: string, message: string) {
    try {
      const response = await this.twilioSmsService.sendSms(to, message);
      return response;
    } catch (error) {
      throw new Error(`Failed to send SMS message: ${error.message}`);
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

      const response = await this.twilioSmsService.sendSms(to, body);
      return response;
    } catch (error) {
      throw new Error(`Failed to send invitation SMS: ${error.message}`);
    }
  }

  async sendPasswordResetNotification(
    to: string,
    data: { resetUrl: string; expiryTime: string },
  ) {
    try {
      const body = `Your password reset link: ${data.resetUrl}. This link expires in ${data.expiryTime}.`;

      const response = await this.twilioSmsService.sendSms(to, body);
      return response;
    } catch (error) {
      throw new Error(`Failed to send password reset SMS: ${error.message}`);
    }
  }
}
