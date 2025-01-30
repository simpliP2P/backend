export interface AuthTokens {
    access_token: string;
    refresh_token: string;
}

export interface SanitizedUserOrganisation {
    org_id: string;
    role: string;
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
    role: string;
    provider: string;
    user_organisations: SanitizedUserOrganisation[];
}