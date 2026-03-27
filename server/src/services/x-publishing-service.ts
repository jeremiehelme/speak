import crypto from 'node:crypto';
import { SettingsService } from './settings-service.js';

export interface XCredentials {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessTokenSecret: string;
}

const X_CREDENTIAL_KEYS = [
  'x_api_key',
  'x_api_secret',
  'x_access_token',
  'x_access_token_secret',
] as const;

export class XPublishingService {
  constructor(private settings: SettingsService) {}

  async getCredentials(): Promise<XCredentials | null> {
    const apiKey = await this.settings.get('x_api_key');
    const apiSecret = await this.settings.get('x_api_secret');
    const accessToken = await this.settings.get('x_access_token');
    const accessTokenSecret = await this.settings.get('x_access_token_secret');

    if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) {
      return null;
    }

    return { apiKey, apiSecret, accessToken, accessTokenSecret };
  }

  async hasCredentials(): Promise<boolean> {
    const creds = await this.getCredentials();
    return creds !== null;
  }

  async saveCredentials(creds: XCredentials): Promise<void> {
    await this.settings.set('x_api_key', creds.apiKey);
    await this.settings.set('x_api_secret', creds.apiSecret);
    await this.settings.set('x_access_token', creds.accessToken);
    await this.settings.set('x_access_token_secret', creds.accessTokenSecret);
  }

  async validateCredentials(creds?: XCredentials): Promise<{ valid: boolean; message?: string }> {
    const credentials = creds ?? (await this.getCredentials());
    if (!credentials) {
      return { valid: false, message: 'No X API credentials configured' };
    }

    try {
      const oauthHeader = this.buildOAuthHeader(
        'GET',
        'https://api.twitter.com/2/users/me',
        credentials,
      );

      const response = await fetch('https://api.twitter.com/2/users/me', {
        method: 'GET',
        headers: {
          Authorization: oauthHeader,
        },
      });

      if (response.ok) {
        return { valid: true };
      }

      const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      if (response.status === 401) {
        return { valid: false, message: 'Invalid credentials or token expired' };
      }
      if (response.status === 403) {
        return { valid: false, message: 'Access denied — check app permissions' };
      }
      if (response.status === 429) {
        return { valid: false, message: 'Rate limited — try again later' };
      }

      const detail =
        typeof body?.detail === 'string' ? body.detail : `X API error (${response.status})`;
      return { valid: false, message: detail };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection to X API failed';
      return { valid: false, message };
    }
  }

  async publishTweet(text: string): Promise<{ id: string; url: string }> {
    const credentials = await this.getCredentials();
    if (!credentials) {
      throw new Error('No X API credentials configured');
    }

    if (text.length > 280) {
      throw new Error('Tweet exceeds 280 character limit');
    }

    const url = 'https://api.twitter.com/2/tweets';
    const oauthHeader = this.buildOAuthHeader('POST', url, credentials);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: oauthHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      if (response.status === 429) {
        throw new Error('X API rate limit reached — try again later');
      }
      const detail =
        typeof body?.detail === 'string' ? body.detail : `Failed to publish (${response.status})`;
      throw new Error(detail);
    }

    const result = (await response.json()) as { data: { id: string } };
    const tweetId = result.data.id;

    // Get username for URL construction
    const userHeader = this.buildOAuthHeader(
      'GET',
      'https://api.twitter.com/2/users/me',
      credentials,
    );
    const userResponse = await fetch('https://api.twitter.com/2/users/me', {
      headers: { Authorization: userHeader },
    });
    let username = 'i'; // fallback
    if (userResponse.ok) {
      const userData = (await userResponse.json()) as { data: { username: string } };
      username = userData.data.username;
    }

    return {
      id: tweetId,
      url: `https://x.com/${username}/status/${tweetId}`,
    };
  }

  /** Build OAuth 1.0a Authorization header */
  buildOAuthHeader(method: string, url: string, creds: XCredentials): string {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = generateNonce();

    const oauthParams: Record<string, string> = {
      oauth_consumer_key: creds.apiKey,
      oauth_nonce: nonce,
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: timestamp,
      oauth_token: creds.accessToken,
      oauth_version: '1.0',
    };

    // Create signature base string
    const paramString = Object.keys(oauthParams)
      .sort()
      .map((k) => `${encodeRFC3986(k)}=${encodeRFC3986(oauthParams[k]!)}`)
      .join('&');

    const baseString = `${method.toUpperCase()}&${encodeRFC3986(url)}&${encodeRFC3986(paramString)}`;
    const signingKey = `${encodeRFC3986(creds.apiSecret)}&${encodeRFC3986(creds.accessTokenSecret)}`;

    // HMAC-SHA1 signature
    const signature = crypto.createHmac('sha1', signingKey).update(baseString).digest('base64');

    oauthParams['oauth_signature'] = signature;

    const headerString = Object.keys(oauthParams)
      .sort()
      .map((k) => `${encodeRFC3986(k)}="${encodeRFC3986(oauthParams[k]!)}"`)
      .join(', ');

    return `OAuth ${headerString}`;
  }
}

function encodeRFC3986(str: string): string {
  return encodeURIComponent(str).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function generateNonce(): string {
  return crypto.randomBytes(16).toString('hex');
}

export { X_CREDENTIAL_KEYS };
