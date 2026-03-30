import { SettingsService } from './settings-service.js';

export interface ThreadsCredentials {
  accessToken: string;
  userId: string;
}

const THREADS_CREDENTIAL_KEYS = ['threads_access_token', 'threads_user_id'] as const;

export class ThreadsPublishingService {
  constructor(private settings: SettingsService) {}

  async getCredentials(): Promise<ThreadsCredentials | null> {
    const accessToken = await this.settings.get('threads_access_token');
    const userId = await this.settings.get('threads_user_id');

    if (!accessToken || !userId) {
      return null;
    }

    return { accessToken, userId };
  }

  async hasCredentials(): Promise<boolean> {
    const creds = await this.getCredentials();
    return creds !== null;
  }

  async saveCredentials(creds: ThreadsCredentials): Promise<void> {
    await this.settings.set('threads_access_token', creds.accessToken);
    await this.settings.set('threads_user_id', creds.userId);
  }

  async validateCredentials(
    creds?: ThreadsCredentials,
  ): Promise<{ valid: boolean; message?: string }> {
    const credentials = creds ?? (await this.getCredentials());
    if (!credentials) {
      return { valid: false, message: 'No Threads API credentials configured' };
    }

    try {
      const url = `https://graph.threads.net/v1.0/${credentials.userId}/threads_publishing_limit?access_token=${credentials.accessToken}`;
      const response = await fetch(url);

      if (response.ok) {
        return { valid: true };
      }

      const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      if (response.status === 190 || response.status === 401) {
        return { valid: false, message: 'Invalid access token or token expired' };
      }
      if (response.status === 429) {
        return { valid: false, message: 'Rate limited — try again later' };
      }

      const errorMsg =
        typeof (body as { error?: { message?: string } })?.error?.message === 'string'
          ? (body as { error: { message: string } }).error.message
          : `Threads API error (${response.status})`;
      return { valid: false, message: errorMsg };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection to Threads API failed';
      return { valid: false, message };
    }
  }

  async publishPost(text: string): Promise<{ id: string; url: string }> {
    const credentials = await this.getCredentials();
    if (!credentials) {
      throw new Error('No Threads API credentials configured');
    }

    if (text.length > 500) {
      throw new Error('Post exceeds 500 character limit');
    }

    // Step 1: Create media container
    const createUrl = `https://graph.threads.net/v1.0/${credentials.userId}/threads`;
    const createResponse = await fetch(createUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        media_type: 'TEXT',
        text,
        access_token: credentials.accessToken,
      }),
    });

    if (!createResponse.ok) {
      const body = (await createResponse.json().catch(() => ({}))) as {
        error?: { message?: string };
      };
      if (createResponse.status === 429) {
        throw new Error('Threads API rate limit reached — try again later');
      }
      const detail =
        typeof body?.error?.message === 'string'
          ? body.error.message
          : `Failed to create post (${createResponse.status})`;
      throw new Error(detail);
    }

    const createResult = (await createResponse.json()) as { id: string };
    const creationId = createResult.id;

    // Step 2: Publish the container
    const publishUrl = `https://graph.threads.net/v1.0/${credentials.userId}/threads_publish`;
    const publishResponse = await fetch(publishUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        creation_id: creationId,
        access_token: credentials.accessToken,
      }),
    });

    if (!publishResponse.ok) {
      const body = (await publishResponse.json().catch(() => ({}))) as {
        error?: { message?: string };
      };
      if (publishResponse.status === 429) {
        throw new Error('Threads API rate limit reached — try again later');
      }
      const detail =
        typeof body?.error?.message === 'string'
          ? body.error.message
          : `Failed to publish post (${publishResponse.status})`;
      throw new Error(detail);
    }

    const publishResult = (await publishResponse.json()) as { id: string };
    const postId = publishResult.id;

    // Get username for URL construction
    const userUrl = `https://graph.threads.net/v1.0/${credentials.userId}?fields=username&access_token=${credentials.accessToken}`;
    const userResponse = await fetch(userUrl);
    let username = 'user';
    if (userResponse.ok) {
      const userData = (await userResponse.json()) as { username?: string };
      if (userData.username) {
        username = userData.username;
      }
    }

    return {
      id: postId,
      url: `https://www.threads.net/@${username}/post/${postId}`,
    };
  }
}

export { THREADS_CREDENTIAL_KEYS };
