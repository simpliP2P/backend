import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PurchaseItem } from "../Entities/purchase-item.entity";
import { PurchaseItemService } from "../Services/purchase-item.service";
import { PurchaseItemController } from "../Controllers/purchase-item.controller";
import { UserOrganisationRepository } from "src/Modules/Organisation/Repositories/user-organisation.repository";

@Module({
  imports: [TypeOrmModule.forFeature([PurchaseItem])],
  providers: [PurchaseItemService, UserOrganisationRepository],
  controllers: [PurchaseItemController],
  exports: [PurchaseItemService],
})
export class PurchaseItemModule {}
