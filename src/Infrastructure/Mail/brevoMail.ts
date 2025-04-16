import axios, { AxiosResponse } from "axios";
import { ConfigService } from "@nestjs/config";
import { Injectable } from "@nestjs/common";

@Injectable()
export class BrevoEmailService {
  private apiUrl: string;
  private apiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.apiUrl = "https://api.brevo.com/v3/smtp/email";
    const apiKey = this.configService.getOrThrow<string>("brevo.apiKey");
    this.apiKey = apiKey;
  }

  private createPayload(
    receiverEmail: string,
    subject: string,
    templateName: string,
  ): object {
    return {
      sender: {
        name: "SimpliP2P",
        email: this.configService.getOrThrow<string>("brevo.email"),
      },
      to: [
        {
          email: receiverEmail,
          //   name: receiverName,
        },
      ],
      subject: subject || "Hello",
      htmlContent: templateName,
    };
  }

  public async sendMail(
    receiverEmail: string,
    templateName: string,
    subject: string = "Hello",
  ): Promise<AxiosResponse> {
    const emailPayload = this.createPayload(
      receiverEmail,
      subject,
      templateName,
    );

    try {
      const response = await axios.post(this.apiUrl, emailPayload, {
        headers: {
          accept: "application/json",
          "api-key": this.apiKey,
          "content-type": "application/json",
        },
      });

      return response;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Error sending email: ${error.message}`);
      } else {
        throw new Error(
          "An unexpected error occurred while sending the email.",
        );
      }
    }
  }
}

export default BrevoEmailService;
