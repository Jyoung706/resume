export interface OAuthParams {
  authUrl: string;
  redirectUrl: string;
}

export type OAuthResult =
  | { code: string; state?: string }
  | { cancelled: true };
