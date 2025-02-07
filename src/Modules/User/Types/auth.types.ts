export interface AuthTokens {
    access_token: string;
    refresh_token: string;
}

export interface SanitizedUserOrganisation {
    org_id: string;
    name: string;
    logo: string;
    role: string; // User's role in the organisation
    permissions: string[];
    is_creator: boolean;
    accepted_invitation?: boolean;
}

export interface SanitizedUser {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    profile_picture: string;
    provider?: string;
    user_organisations?: SanitizedUserOrganisation[];
}