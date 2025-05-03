import { ArrayNotEmpty, IsArray, IsEnum } from "class-validator";
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
