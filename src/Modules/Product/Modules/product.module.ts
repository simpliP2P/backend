import { Module } from "@nestjs/common";
import { ProductService } from "../Services/product.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Product } from "../Entities/product.entity";

@Module({
    imports: [TypeOrmModule.forFeature([Product])],
    controllers: [],
    providers: [ProductService],
    exports: [ProductService],
})

export class ProductModule {}