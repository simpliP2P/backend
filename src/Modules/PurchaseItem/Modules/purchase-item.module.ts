import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PurchaseItem } from "../Entities/purchase-item.entity";
import { PurchaseItemService } from "../Services/purchase-item.service";

@Module({
  imports: [TypeOrmModule.forFeature([PurchaseItem])],
  providers: [PurchaseItemService],
  controllers: [],
  exports: [PurchaseItemService],
})
export class PurchaseItemModule {}
