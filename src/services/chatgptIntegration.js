/**
 * ChatGPT Integration Service
 * Generates content using OpenAI API
 */

const axios = require('axios');

class ChatGPTIntegration {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.openai.com/v1';
  }

  /**
   * Generate content using ChatGPT
   */
  async generateContent(prompt, options = {}) {
    try {
      if (!this.apiKey) {
        throw new Error('OpenAI API key not configured');
      }

      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: options.model || 'gpt-4-turbo',
          messages: [
            {
              role: 'system',
              content:
                options.systemPrompt ||
                'You are a helpful social media manager for MADGER (Madgercoin), a community-driven Solana memecoin. Generate engaging, authentic content about the project, community updates, and cryptocurrency news.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: options.temperature || 0.7,
          max_tokens: options.maxTokens || 280,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const content = response.data.choices[0].message.content;
      console.log('✅ ChatGPT content generated');
      return {
        success: true,
        content,
        tokens: {
          prompt: response.data.usage.prompt_tokens,
          completion: response.data.usage.completion_tokens,
          total: response.data.usage.total_tokens,
        },
      };
    } catch (error) {
      console.error('❌ ChatGPT generation failed:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Generate a tweet about MADGER
   */
  async generateTweet(topic) {
    return this.generateContent(
      `Create an engaging tweet (max 280 characters) about: ${topic}`,
      {
        maxTokens: 100,
        temperature: 0.8,
      }
    );
  }

  /**
   * Generate a Discord message
   */
  async generateDiscordMessage(topic) {
    return this.generateContent(
      `Create an engaging Discord message (2-3 paragraphs) about: ${topic}. Include relevant emojis.`,
      {
        maxTokens: 500,
        temperature: 0.7,
      }
    );
  }

  /**
   * Generate community update content
   */
  async generateCommunityUpdate(updates) {
    const updateText = Array.isArray(updates) ? updates.join('\n- ') : updates;

    return this.generateContent(
      `Generate an engaging community update post for MADGER based on these updates:\n- ${updateText}\n\nMake it enthusiastic and community-focused.`,
      {
        maxTokens: 1000,
        temperature: 0.6,
      }
    );
  }

  /**
   * Generate a series of varied content
   */
  async generateContentSeries(theme, count = 5) {
    const results = [];

    for (let i = 0; i < count; i++) {
      const result = await this.generateContent(
        `Generate unique variation ${i + 1}/${count} of social media content about: ${theme}`,
        {
          maxTokens: 280,
          temperature: 0.8,
        }
      );

      if (result.success) {
        results.push(result.content);
      }
    }

    return {
      success: results.length > 0,
      content: results,
      generated: results.length,
      failed: count - results.length,
    };
  }
}

module.exports = ChatGPTIntegration;
