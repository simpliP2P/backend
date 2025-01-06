import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { render } from "ejs";
import { BrevoEmailService } from "../../../Infrastructure/Brevo/brevoMail";
import { AppLogger } from "src/Logger/logger.service";
import { Injectable } from "@nestjs/common";

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
      `../../../../templates/${templateName}.html`,
    );

    if (!existsSync(filePath)) {
      throw new Error(
        `Email template ${templateName} not found at ${filePath}`,
      );
    }

    const template = readFileSync(filePath, "utf8");
    const renderedTemplate = render(template, data);

    return { toAddress, renderedTemplate, subject };
  }
}
