import { Injectable } from "@nestjs/common";

@Injectable()
export class AppService {
  getRoot(): string {
    return "You probably shouldn't be here.";
  }
}
