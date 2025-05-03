import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { AuditLog } from "../Entities/audit-logs.entity";
import { MoreThan, Repository } from "typeorm";
import {
  IAuditLogResponse,
  IGetAllAuditLogsByOrg,
} from "../Types/audit-logs.types";
import { RequestContext } from "src/Shared/Helpers/request-context.helper";

@Injectable()
export class AuditLogsService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  public async logUpdate(
    entityType: string,
    entityId: string,
    description: string,
    changedFields: Record<string, any> = {},
  ): Promise<void> {
    try {
      await this.auditLogRepository.save({
        organisation: { id: RequestContext.getOrganisationId() || "" },
        user: { id: RequestContext.getUserId() || "" },
        entity_type: entityType,
        entity_id: entityId,
        action: "UPDATE",
        changed_fields: changedFields,
        description,
        created_at: new Date(),
      });
    } catch (error) {
      console.error("Error inserting into audit_logs table:", error?.message);
    }
  }

  public async getAllAuditLogs(
    page: number,
    pageSize: number,
    startDate: Date,
  ): Promise<IAuditLogResponse> {
    let _page = page;
    let _pageSize = pageSize;
    if (isNaN(page) || page < 1) _page = 1;
    if (isNaN(pageSize) || pageSize < 1) _pageSize = 10;

    const skip = (_page - 1) * _pageSize;

    const [data, total] = await this.auditLogRepository.findAndCount({
      where: {
        created_at: MoreThan(startDate),
      },
      take: _pageSize,
      skip,
      relations: ["user", "user.userOrganisations"],
      select: {
        user: {
          id: true,
          first_name: true,
          last_name: true,
          userOrganisations: {
            role: true,
          },
        },
      },
    });

    return {
      logs: data,
      metadata: {
        total,
        page: _page,
        pageSize: _pageSize,
        totalPages: Math.ceil(total / _pageSize),
      },
    };
  }

  public async getAllAuditLogsByOrganisation({
    organisationId,
    page,
    pageSize,
    startDate,
    endDate,
    exportAll = false,
  }: IGetAllAuditLogsByOrg): Promise<IAuditLogResponse> {
    let _page = page && page > 0 ? page : 1;
    let _pageSize = pageSize && pageSize > 0 ? pageSize : 10;

    const [logs, total] = await this.auditLogRepository
      .createQueryBuilder("log")
      .leftJoin("log.user", "user")
      .leftJoin("user.userOrganisations", "uo", "uo.organisation_id = :orgId", {
        orgId: organisationId,
      })
      .addSelect([
        "user.id",
        "user.first_name",
        "user.last_name",
        "uo.role",
      ])
      .where("log.organisation_id = :orgId", { orgId: organisationId })
      .andWhere(
        startDate && endDate
          ? "log.created_at BETWEEN :startDate AND :endDate"
          : startDate
            ? "log.created_at >= :startDate"
            : endDate
              ? "log.created_at <= :endDate"
              : "1=1",
        {
          startDate,
          endDate,
        },
      )
      .take(exportAll ? undefined : _pageSize)
      .skip(exportAll ? undefined : (_page - 1) * _pageSize)
      .getManyAndCount();


    return {
      logs,
      metadata: {
        total,
        page: _page,
        pageSize: _pageSize,
        totalPages: Math.ceil(total / _pageSize),
      },
    };
  }

  public async getAllAuditLogsByUser(
    organisationId: string,
    userId: string,
    page: number,
    pageSize: number,
  ): Promise<IAuditLogResponse> {
    let _page = page;
    let _pageSize = pageSize;
    if (isNaN(page) || page < 1) _page = 1;
    if (isNaN(pageSize) || pageSize < 1) _pageSize = 10;

    const skip = (_page - 1) * _pageSize;

    const [data, total] = await this.auditLogRepository.findAndCount({
      where: {
        user: { id: userId },
        organisation: { id: organisationId },
      },
      take: _pageSize,
      skip,
      relations: ["user", "user.userOrganisations"],
      select: {
        user: {
          id: true,
          first_name: true,
          last_name: true,
          userOrganisations: {
            role: true,
          },
        },
      },
    });

    return {
      logs: data,
      metadata: {
        total,
        page: _page,
        pageSize: _pageSize,
        totalPages: Math.ceil(total / _pageSize),
      },
    };
  }

  async findOrgLogsByIds({
    organisationId,
    ids,
  }: {
    organisationId: string;
    ids: string[];
  }): Promise<AuditLog[]> {
    return await this.auditLogRepository
      .createQueryBuilder("log")
      .leftJoinAndSelect("log.user", "user")
      .leftJoinAndSelect(
        "user.userOrganisations",
        "uo",
        "uo.organisation_id = :orgId",
        { orgId: organisationId },
      )
      .addSelect(["user.first_name", "user.last_name", "uo.role"])
      .where("log.organisation_id = :orgId", { orgId: organisationId })
      .andWhere("log.id IN (:...ids)", { ids })
      .getMany();
  }
}
