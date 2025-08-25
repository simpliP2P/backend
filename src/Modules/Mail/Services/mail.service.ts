import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { render } from "ejs";
import { BrevoEmailService } from "../../../Infrastructure/Notification/brevo-mail";
import { AppLogger } from "src/Logger/logger.service";
import { Injectable } from "@nestjs/common";
import { emailInvitationData } from "src/Modules/Organisation/Types/organisation.types";

@Injectable()
export class EmailServices {
  private readonly year = new Date().getFullYear();

  constructor(
    private readonly brevoEmailService: BrevoEmailService,
    private readonly logger: AppLogger,
  ) {}

  async sendWelcomeEmail(firstName: string, email: string) {
    const subject = "Welcome to SimpliP2P";
    const templateName = "welcomeEmail";
    const sendEmailParams = await this.buildSendEmailParams(
      email,
      subject,
      templateName,
      { firstName },
    );
    return this.sendEmail(sendEmailParams);
  }

  async sendVerificationEmail(
    firstName: string,
    email: string,
    verificationLink: string,
  ) {
    const subject = "Email Verification";
    const templateName = "verifyEmail";
    const sendEmailParams = await this.buildSendEmailParams(
      email,
      subject,
      templateName,
      {
        firstName,
        verificationLink,
        year: this.year,
      },
    );
    return this.sendEmail(sendEmailParams);
  }

  async sendResetPasswordEmail(
    firstName: string,
    email: string,
    resetLink: string,
  ) {
    const subject = "Reset Password";
    const templateName = "resetPasswordEmail";
    const sendEmailParams = await this.buildSendEmailParams(
      email,
      subject,
      templateName,
      {
        firstName,
        email,
        resetLink,
        year: this.year,
      },
    );
    return this.sendEmail(sendEmailParams);
  }

  async sendPurchaseOrderEmail(
    email: string,
    data: {
      organisationName: string;
      supplierName: string;
      signedUrl: string;
    },
  ) {
    const subject = "New Purchase Order";
    const templateName = "purchaseOrderEmail";
    const sendEmailParams = await this.buildSendEmailParams(
      email,
      subject,
      templateName,
      data,
    );
    return this.sendEmail(sendEmailParams);
  }

  async invitationEmail(email: string, data: emailInvitationData) {
    try {
      const subject = `Invitation to join ${data.organisationName}`;
      const templateName = "organisationInvitationEmail";
      const sendEmailParams = await this.buildSendEmailParams(
        email,
        subject,
        templateName,
        {
          ...data,
          year: this.year,
        },
      );
      return this.sendEmail(sendEmailParams);
    } catch (error) {
      this.logger.error("Error sending invitation email:", error);
      throw new Error(`Failed to send invitation email: ${error.message}`);
    }
  }

  async sendProductsBulkUploadResultEmail(
    email: string,
    data: {
      organisationName: string;
      result: {
        totalProcessed: number;
        successCount: number;
        failedCount: number;
        failedRows: Array<{
          rowNumber: number;
          error: string;
          data: { name: string };
        }>;
      };
    },
  ) {
    const subject = "Bulk Upload Result for " + data.organisationName;
    const templateName = "bulkUploadResultEmail"; // should match your .ejs file name

    const sendEmailParams = await this.buildSendEmailParams(
      email,
      subject,
      templateName,
      data,
    );

    return this.sendEmail(sendEmailParams);
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
      this.logger.error("Error sending email:", error);
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
      `../../../../templates/${templateName}.html`, // Ensure the template path is correct
    );

    if (!existsSync(filePath)) {
      throw new Error(
        `Email template ${templateName} not found at ${filePath}`,
      );
    }

    const template = readFileSync(filePath, "utf8");

    // Check if the template is loaded properly
    if (!template) {
      throw new Error(`Failed to load template: ${templateName}`);
    }
    const renderedTemplate = render(template, data);

    return { toAddress, renderedTemplate, subject };
  }
}
