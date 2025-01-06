import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigService } from "@nestjs/config";
import { User } from "src/Modules/User/Entities/user.entity";
import { Token } from "src/Modules/Token/Entities/token.entity";

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService], // Inject ConfigService to access the configuration
      useFactory: (configService: ConfigService) => {
        const databaseConfig = configService.get("database"); // Access the 'database' object
        return {
          type: "postgres",
          host: databaseConfig.host,
          port: databaseConfig.port,
          username: databaseConfig.username,
          password: databaseConfig.password,
          database: databaseConfig.name,
          entities: [User, Token],
          synchronize: configService.get("isAppInProduction"), 
          ssl: {
            rejectUnauthorized: configService.get("isAppInProduction"),
          },
        };
      },
    }),
  ],
})
export class DatabaseModule {}
