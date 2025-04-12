import { Module } from "@nestjs/common";
import { SmsService } from "./Services/sms.service";
import { TwilioSmsService } from "src/Infrastructure/SMS/twilio-sms";

@Module({
  providers: [SmsService, TwilioSmsService],
  exports: [SmsService],
})
export class SmsModule {}
