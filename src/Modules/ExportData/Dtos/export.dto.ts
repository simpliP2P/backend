import { ArrayNotEmpty, IsArray, IsDateString, IsEnum } from "class-validator";
import { ExportEntityType, ExportFileType } from "../Enums/export.enum";

export class ExportSelectedDto {
  @IsEnum(ExportEntityType)
  entity: ExportEntityType;

  @IsEnum(ExportFileType)
  format: ExportFileType;

  @IsArray()
  @ArrayNotEmpty()
  ids: string[];
}

export class ExportQueryDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsEnum(ExportFileType)
  format: ExportFileType;
}
