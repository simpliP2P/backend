import { Injectable } from "@nestjs/common";
import { BrevoEmailService } from "src/Infrastructure/Notification/brevo-mail";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { render } from "ejs";
import { ITemplateNotificationService } from "../Interfaces/notification.interface";

@Injectable()
export class EmailNotificationService implements ITemplateNotificationService {
  private readonly year = new Date().getFullYear();

  constructor(private readonly brevoEmailService: BrevoEmailService) {}

  async sendPurchaseOrderNotification(
    to: string,
    data: { organisationName: string; supplierName: string; poUrl: string },
  ) {
    try {
      const subject = "New Purchase Order";
      const templateName = "purchaseOrderEmail";
      const sendEmailParams = await this.buildSendEmailParams(
        to,
        subject,
        templateName,
        data,
      );
      return this.sendEmail(sendEmailParams);
    } catch (error) {
      throw new Error(`Failed to send email notification: ${error.message}`);
    }
  }

  async sendGenericMessage(to: string, message: string) {
    try {
      const subject = "Message from SimpliP2P";
      const templateName = "generic-message";
      const sendEmailParams = await this.buildSendEmailParams(
        to,
        subject,
        templateName,
        { message },
      );
      return this.sendEmail(sendEmailParams);
    } catch (error) {
      throw new Error(`Failed to send email message: ${error.message}`);
    }
  }

  async sendGenericEmail(
    to: string,
    subject: string,
    template: string,
    variables?: Record<string, any>,
  ) {
    try {
      const sendEmailParams = await this.buildSendEmailParams(
        to,
        subject,
        template,
        variables || {},
      );
      return this.sendEmail(sendEmailParams);
    } catch (error) {
      throw new Error(`Failed to send email: ${error.message}`);
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
      const subject = `Invitation to join ${data.organisationName}`;
      const templateName = "organisationInvitationEmail";
      const sendEmailParams = await this.buildSendEmailParams(
        to,
        subject,
        templateName,
        {
          ...data,
          year: this.year,
        },
      );
      return this.sendEmail(sendEmailParams);
    } catch (error) {
      throw new Error(`Failed to send invitation email: ${error.message}`);
    }
  }

  async sendPasswordResetNotification(
    to: string,
    data: { resetUrl: string; expiryTime: string; userName?: string },
  ) {
    try {
      const subject = "Reset Password";
      const templateName = "resetPasswordEmail";
      const sendEmailParams = await this.buildSendEmailParams(
        to,
        subject,
        templateName,
        {
          firstName: data.userName || "User",
          email: to,
          resetLink: data.resetUrl,
          year: this.year,
        },
      );
      return this.sendEmail(sendEmailParams);
    } catch (error) {
      throw new Error(`Failed to send password reset email: ${error.message}`);
    }
  }

  async sendWelcomeEmail(
    to: string,
    data: { userName: string; organisationName?: string },
  ) {
    try {
      const subject = "Welcome to SimpliP2P";
      const templateName = "welcomeEmail";
      const sendEmailParams = await this.buildSendEmailParams(
        to,
        subject,
        templateName,
        {
          firstName: data.userName,
          organisationName: data.organisationName || "SimpliP2P",
        },
      );
      return this.sendEmail(sendEmailParams);
    } catch (error) {
      throw new Error(`Failed to send welcome email: ${error.message}`);
    }
  }

  async sendBulkEmail(
    recipients: string[],
    subject: string,
    template: string,
    variables?: Record<string, any>,
  ) {
    try {
      // For bulk email, we'll send to each recipient individually
      const results = [];
      for (const recipient of recipients) {
        const sendEmailParams = await this.buildSendEmailParams(
          recipient,
          subject,
          template,
          variables || {},
        );
        const result = await this.sendEmail(sendEmailParams);
        results.push({ recipient, result });
      }
      return results;
    } catch (error) {
      throw new Error(`Failed to send bulk email: ${error.message}`);
    }
  }

  private async sendEmail(params: {
    toAddress: string;
    renderedTemplate: string;
    subject: string;
  }) {
    const { toAddress, renderedTemplate, subject } = params;

    try {
      const response = await this.brevoEmailService.sendMail(
        toAddress,
        renderedTemplate,
        subject,
      );
      return response;
    } catch (error) {
      throw error;
    }
  }

  private async buildSendEmailParams(
    toAddress: string,
    subject: string,
    templateName: string,
    data: object,
  ) {
    const filePath = join(
      __dirname,
      `../../../../templates/${templateName}.html`,
    );

    if (!existsSync(filePath)) {
      throw new Error(
        `Email template ${templateName} not found at ${filePath}`,
      );
    }

    const template = readFileSync(filePath, "utf8");

    if (!template) {
      throw new Error(`Failed to load template: ${templateName}`);
    }
    const renderedTemplate = render(template, data);

    return { toAddress, renderedTemplate, subject };
  }
}
