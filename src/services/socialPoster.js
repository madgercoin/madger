/**
 * Social Media Posting Service
 * Handles posting content across multiple platforms
 */

const axios = require('axios');

class SocialPoster {
  constructor(config = {}) {
    this.twitterApiKey = config.twitterApiKey;
    this.twitterApiSecret = config.twitterApiSecret;
    this.twitterBearerToken = config.twitterBearerToken;
    this.discordWebhookUrl = config.discordWebhookUrl;
    this.telegramBotToken = config.telegramBotToken;
    this.telegramChatId = config.telegramChatId;
    this.linkedinAccessToken = config.linkedinAccessToken;
  }

  /**
   * Post to Twitter/X
   */
  async postToTwitter(message) {
    try {
      if (!this.twitterBearerToken) {
        console.warn('Twitter Bearer Token not configured');
        return { success: false, error: 'Twitter not configured' };
      }

      const response = await axios.post(
        'https://api.twitter.com/2/tweets',
        { text: message },
        {
          headers: {
            Authorization: `Bearer ${this.twitterBearerToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('✅ Tweet posted:', response.data.data.id);
      return { success: true, platform: 'twitter', id: response.data.data.id };
    } catch (error) {
      console.error('❌ Twitter post failed:', error.message);
      return { success: false, platform: 'twitter', error: error.message };
    }
  }

  /**
   * Post to Discord
   */
  async postToDiscord(message, options = {}) {
    try {
      if (!this.discordWebhookUrl) {
        console.warn('Discord webhook URL not configured');
        return { success: false, error: 'Discord not configured' };
      }

      const payload = {
        content: message,
        ...(options.embeds && { embeds: options.embeds }),
        ...(options.username && { username: options.username }),
      };

      const response = await axios.post(this.discordWebhookUrl, payload);

      console.log('✅ Discord message posted');
      return { success: true, platform: 'discord' };
    } catch (error) {
      console.error('❌ Discord post failed:', error.message);
      return { success: false, platform: 'discord', error: error.message };
    }
  }

  /**
   * Post to Telegram
   */
  async postToTelegram(message, options = {}) {
    try {
      if (!this.telegramBotToken || !this.telegramChatId) {
        console.warn('Telegram credentials not configured');
        return { success: false, error: 'Telegram not configured' };
      }

      const response = await axios.post(
        `https://api.telegram.org/bot${this.telegramBotToken}/sendMessage`,
        {
          chat_id: this.telegramChatId,
          text: message,
          parse_mode: options.parseMode || 'HTML',
        }
      );

      console.log('✅ Telegram message posted:', response.data.result.message_id);
      return { success: true, platform: 'telegram', id: response.data.result.message_id };
    } catch (error) {
      console.error('❌ Telegram post failed:', error.message);
      return { success: false, platform: 'telegram', error: error.message };
    }
  }

  /**
   * Post to LinkedIn
   */
  async postToLinkedIn(message, options = {}) {
    try {
      if (!this.linkedinAccessToken) {
        console.warn('LinkedIn access token not configured');
        return { success: false, error: 'LinkedIn not configured' };
      }

      const response = await axios.post(
        'https://api.linkedin.com/v2/ugcPosts',
        {
          author: 'urn:li:person:YOUR_LINKEDIN_ID',
          lifecycleState: 'PUBLISHED',
          specificContent: {
            'com.linkedin.ugc.PublishText': {
              text: message,
            },
          },
          visibility: {
            'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.linkedinAccessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('✅ LinkedIn post created');
      return { success: true, platform: 'linkedin' };
    } catch (error) {
      console.error('❌ LinkedIn post failed:', error.message);
      return { success: false, platform: 'linkedin', error: error.message };
    }
  }

  /**
   * Post to all configured platforms
   */
  async postToAll(message, options = {}) {
    const results = [];

    console.log('🚀 Posting to all platforms...\n');

    if (this.twitterBearerToken) {
      results.push(await this.postToTwitter(message));
    }

    if (this.discordWebhookUrl) {
      results.push(await this.postToDiscord(message, options.discord));
    }

    if (this.telegramBotToken && this.telegramChatId) {
      results.push(await this.postToTelegram(message, options.telegram));
    }

    if (this.linkedinAccessToken) {
      results.push(await this.postToLinkedIn(message, options.linkedin));
    }

    const successful = results.filter((r) => r.success).length;
    console.log(`\n📊 Results: ${successful}/${results.length} platforms succeeded`);

    return results;
  }
}

module.exports = SocialPoster;
