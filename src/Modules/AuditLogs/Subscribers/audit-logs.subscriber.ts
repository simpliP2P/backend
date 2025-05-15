import {
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  UpdateEvent,
  RemoveEvent,
} from "typeorm";
import { AuditLog } from "../Entities/audit-logs.entity";
import { RequestContext } from "src/Shared/Helpers/request-context.helper"; // Get the user performing the action
import { PurchaseRequisition } from "src/Modules/PurchaseRequisition/Entities/purchase-requisition.entity";

@EventSubscriber()
export class AuditSubscriber implements EntitySubscriberInterface {
  /**
   * Listen to Insert Event (CREATE)
   */
  async afterInsert(event: InsertEvent<any>) {
    if (!this.shouldLog(event)) return;

    const relevantFields = ["id", "pr_number", "department", "requestor_name"];

    // Extract only the relevant fields from the entity
    const filteredFields = Object.fromEntries(
      Object.entries(event.entity).filter(([key]) =>
        relevantFields.includes(key),
      ),
    );

    const auditRepo = event.manager.getRepository(AuditLog);
    try {
      await auditRepo.save({
        organisation: {
          id:
            RequestContext.getOrganisationId() || event.entity.organisation.id,
        },
        user: { id: RequestContext.getUserId() || "" },
        entity_type: event.metadata.tableName,
        entity_id: event.entity?.id,
        action: "CREATE",
        changed_fields: filteredFields,
        description: `Created new ${
          event.metadata.tableName
            .replace(/_/g, " ") // Replace underscores with spaces
            .replace(/(s|es)$/, "") // Remove trailing "s" or "es"
        } ${event.entity.po_number || event.entity.pr_number || event.entity.id}`,
        created_at: new Date(),
      });
    } catch (error) {
      console.log("Error inserting into audit_logs table:", error?.message);
    }
  }

  /**
   * Listen to Update Event (UPDATE)
   */
  async afterUpdate(event: UpdateEvent<any>) {
    if (!this.shouldLog(event)) return;

    const changedFields: Record<string, any> = {};
    const previousValues: Record<string, any> = {};

    // Ensure databaseEntity is available
    if (!event.databaseEntity) {
      console.warn("No databaseEntity available. Skipping audit log.");
      return;
    }

    // Ensure event.entity is available, else fallback to databaseEntity
    const newValues = event.entity || {};
    const oldValues = event?.databaseEntity;

    Object.keys(oldValues).forEach((column) => {
      const oldValue = oldValues[column];
      const newValue = newValues[column];

      if (
        newValue !== undefined &&
        newValue !== oldValue &&
        column !== "updated_at"
      ) {
        changedFields[column] = newValue;
        previousValues[column] = oldValue;
      }
    });

    if (Object.keys(changedFields).length === 0) return; // No changes detected

    const auditRepo = event.manager.getRepository(AuditLog);
    try {
      await auditRepo.save({
        organisation: { id: RequestContext.getOrganisationId() || "" },
        user: { id: RequestContext.getUserId() || "" },
        entity_type: event.metadata.tableName,
        entity_id: oldValues.id ?? "",
        action: "UPDATE",
        changed_fields: changedFields,
        previous_values: previousValues,
        description: this.generateUpdateDescription(oldValues, changedFields),
        created_at: new Date(),
      });
    } catch (error) {
      console.log("Error inserting into audit_logs table:", error?.message);
    }
  }

  /**
   * Listen to Delete Event (DELETE)
   */
  async afterRemove(event: RemoveEvent<any>) {
    if (!this.shouldLog(event)) return;

    const auditRepo = event.manager.getRepository(AuditLog);

    try {
      await auditRepo.save({
        organisation: { id: RequestContext.getOrganisationId() || "" },
        user: { id: RequestContext.getUserId() || "" },
        entity_type: event.metadata.tableName,
        entity_id: event.databaseEntity.id,
        action: "DELETE",
        previous_values: event.databaseEntity, // Store deleted data
        description: `Deleted ${
          event.metadata.tableName
            .replace(/_/g, " ") // Replace underscores with spaces
            .replace(/(s|es)$/, "") // Remove trailing "s" or "es"
        } (${event.databaseEntity.id})`,
        created_at: new Date(),
      });
    } catch (error) {
      console.log("Error inserting into audit_logs table:", error?.message);
    }
  }

  /**
   * Generate a human-readable description for updates
   */
  private generateUpdateDescription(
    entity: any,
    changedFields: Record<string, any>,
  ): string {
    if (entity instanceof PurchaseRequisition) {
      if (changedFields.status) {
        return `Purchase Requisition ${entity.pr_number} status changed to ${changedFields.status}`;
      }
      if (changedFields.approved_by) {
        return `Purchase Requisition ${entity.pr_number} approved by user ${changedFields.approved_by}`;
      }
    }
    return `Updated ${entity.constructor.name} fields: ${Object.keys(changedFields).join(", ")}`;
  }

  /**
   * Filter out unwanted logging
   */
  private shouldLog(
    event: InsertEvent<any> | UpdateEvent<any> | RemoveEvent<any>,
  ): boolean {
    return [
      "purchase_requisitions",
      "purchase_orders",
      "suppliers",
      "user_organisations",
      "products",
      "organisation_departments",
      "organisation_branches",
      "comments",
      "budgets",
    ].includes(event.metadata.tableName);
  }
}
