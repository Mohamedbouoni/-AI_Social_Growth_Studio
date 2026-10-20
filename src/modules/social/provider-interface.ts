// =============================================================================
// Social Provider Interface
// =============================================================================
// Each social platform (YouTube, TikTok, Instagram) implements this interface.
// Capabilities vary by platform — optional methods reflect this reality.
// =============================================================================

export interface TokenSet {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scopes: string[];
}

export interface SocialAccount {
  platformUserId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  followerCount?: number;
}

export interface AnalyticsRecord {
  contentId: string;
  metrics: Record<string, number>;
  capturedAt: Date;
}

export interface SocialProvider {
  readonly platform: "youtube" | "tiktok" | "instagram";

  /**
   * Generate the OAuth authorization URL for the user to visit.
   */
  getAuthorizationUrl(state: string, redirectUri: string): string;

  /**
   * Exchange the authorization code for access/refresh tokens.
   */
  exchangeCode(code: string, redirectUri: string): Promise<TokenSet>;

  /**
   * Refresh an expired access token.
   */
  refreshToken?(refreshToken: string): Promise<TokenSet>;

  /**
   * Retrieve the authenticated user's account info.
   */
  getAccount(accessToken: string): Promise<SocialAccount>;

  /**
   * Fetch analytics for the user's content.
   * Not all platforms support this, or may require additional scopes.
   */
  getAnalytics?(
    accessToken: string,
    contentIds?: string[]
  ): Promise<AnalyticsRecord[]>;
}
