/**
 * MADGER - ChatGPT Social Integration Entry Point
 */

const ChatGPTIntegration = require('./services/chatgptIntegration');
const SocialPoster = require('./services/socialPoster');

// Export services for use in workflows and scripts
module.exports = {
  ChatGPTIntegration,
  SocialPoster,

  /**
   * Initialize the integration with all credentials
   */
  initializeIntegration(config) {
    return {
      chatgpt: new ChatGPTIntegration(config.openaiApiKey),
      poster: new SocialPoster(config),
    };
  },
};

// Example usage:
if (require.main === module) {
  (async () => {
    const config = {
      openaiApiKey: process.env.OPENAI_API_KEY,
      twitterBearerToken: process.env.TWITTER_BEARER_TOKEN,
      discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL,
      telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
      telegramChatId: process.env.TELEGRAM_CHAT_ID,
    };

    const { chatgpt, poster } = module.exports.initializeIntegration(config);

    console.log('🚀 MADGER ChatGPT Social Integration Started\n');

    // Generate content
    const contentResult = await chatgpt.generateTweet('MADGER community update');

    if (contentResult.success) {
      console.log('📝 Generated Content:');
      console.log(contentResult.content);
      console.log(`\n📊 Tokens used: ${contentResult.tokens.total}\n`);

      // Post to all platforms
      const postResults = await poster.postToAll(contentResult.content);

      console.log('\n📤 Posting Complete!');
      console.log('━'.repeat(50));
    } else {
      console.error('❌ Failed to generate content:', contentResult.error);
    }
  })();
}
