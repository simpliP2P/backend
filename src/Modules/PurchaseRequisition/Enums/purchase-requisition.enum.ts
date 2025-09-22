export enum PurchaseRequisitionStatus {
  INITIALIZED = "INITIALIZED",
  SAVED_FOR_LATER = "SAVED_FOR_LATER",
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  REQUEST_MODIFICATION = "REQUEST_MODIFICATION",
}

export enum PRApprovalActionType {
  APPROVE = "approve",
  APPROVE_AND_CREATE_PO = "approve_and_create_po",
  REJECT = "reject",
  SUBMIT_FOR_APPROVAL = "submit_for_approval",
}

export const ActionToStatusMap = {
  [PRApprovalActionType.APPROVE]: PurchaseRequisitionStatus.APPROVED,
  [PRApprovalActionType.APPROVE_AND_CREATE_PO]:
    PurchaseRequisitionStatus.APPROVED,
  [PRApprovalActionType.REJECT]: PurchaseRequisitionStatus.REJECTED,
  [PRApprovalActionType.SUBMIT_FOR_APPROVAL]: PurchaseRequisitionStatus.PENDING,
};
