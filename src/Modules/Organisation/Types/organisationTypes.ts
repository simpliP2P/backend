export interface CreateOrganisationInput {
  name: string;
  address: string;
  creator_role: string;
}

export interface updateUserDetails {
  role: string;
  permissions: string[];
}

export interface addUserToOrg extends updateUserDetails {
  first_name: string;
  last_name: string;
  email: string;
}

export interface baseEmailInvitationData {
  firstName: string;
  role: string;
  organisationName: string;
  organisationId?: string;
}

export interface emailInvitationData extends baseEmailInvitationData {
  invitationLink: string;
}
