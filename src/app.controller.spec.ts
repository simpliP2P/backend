import { Test, TestingModule } from "@nestjs/testing";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";

describe("AppController", () => {
  let appController: AppController;
  let appService: AppService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
    appService = app.get<AppService>(AppService);
  });

  describe("getRoot", () => {
    it("should return a valid ApiResponse", () => {
      // Mock the AppService getRoot method
      const mockMessage = "You probably shouldn't be here.";
      jest.spyOn(appService, "getRoot").mockReturnValue(mockMessage);

      // Call the controller's getRoot method
      const response = appController.getRoot();

      // Assert the response structure and content
      expect(response).toEqual({
        status: "success",
        message: mockMessage,
        data: {
          service: "Simplip2p-api",
          version: "1.0.0",
        },
      });

      // Ensure the service method was called
      expect(appService.getRoot).toHaveBeenCalled();
    });
  });
});
