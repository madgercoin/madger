# ChatGPT Social Media Integration Setup Guide

This guide walks you through setting up ChatGPT-powered content generation and multi-platform posting for MADGER.

## 📋 Overview

The integration consists of three main components:

1. **ChatGPT Integration Service** - Generates engaging content using OpenAI's API
2. **Social Media Poster Service** - Posts to multiple platforms (Twitter, Discord, Telegram, LinkedIn)
3. **GitHub Action Workflow** - Automates content generation and posting

## 🔧 Prerequisites

- GitHub account with access to madgercoin/madger repository
- OpenAI API key
- API credentials for platforms you want to post to

## 📲 Step-by-Step Setup

### 1. Get OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in
3. Navigate to API keys section
4. Create a new API key
5. Copy the key (you won't see it again!)

### 2. Add Secrets to GitHub Repository

Go to **Settings → Secrets and variables → Actions** and add:

#### Required:
- `OPENAI_API_KEY` - Your OpenAI API key

#### Optional (for platforms you want to use):

**Twitter/X:**
- `TWITTER_BEARER_TOKEN` - Get from [Twitter Developer Portal](https://developer.twitter.com/)

**Discord:**
- `DISCORD_WEBHOOK_URL` - Create webhook in Discord server settings

**Telegram:**
- `TELEGRAM_BOT_TOKEN` - Get from [@BotFather](https://t.me/botfather)
- `TELEGRAM_CHAT_ID` - Message your bot, then get ID from [Telegram Bot API](https://api.telegram.org/bot{TOKEN}/getUpdates)

**LinkedIn:**
- `LINKEDIN_ACCESS_TOKEN` - Get from [LinkedIn Developer Console](https://www.linkedin.com/developers/apps)

### 3. Configure Workflow

The workflow is already set up in `.github/workflows/chatgpt-social-post.yml`

**Automatic posting:**
- Runs daily at 9 AM UTC
- Generates new content automatically
- Posts to all configured platforms

**Manual posting:**
1. Go to **Actions → ChatGPT Social Media Posting**
2. Click **Run workflow**
3. Enter topic and select platforms
4. Click **Run workflow**

### 4. Test the Integration

```bash
# Install dependencies locally
npm install axios

# Run a test
node -e "
const ChatGPT = require('./src/services/chatgptIntegration.js');
const chatgpt = new ChatGPT('your-api-key');

(async () => {
  const result = await chatgpt.generateTweet('MADGER community');
  console.log(result);
})();
"
```

## 📱 Platform-Specific Setup

### Twitter/X
1. Go to [Twitter Developer Portal](https://developer.twitter.com/)
2. Create an app (or use existing)
3. Enable "Read and Write" permissions
4. Generate API key and secret
5. Get Bearer Token from app settings

### Discord
1. Open your Discord server
2. Go to **Channel Settings → Webhooks**
3. Click **New Webhook**
4. Copy the webhook URL
5. Add to GitHub secrets as `DISCORD_WEBHOOK_URL`

### Telegram
1. Chat with [@BotFather](https://t.me/botfather) on Telegram
2. Create a new bot: `/newbot`
3. Follow prompts and get your bot token
4. Chat with your bot, then visit: `https://api.telegram.org/bot{TOKEN}/getUpdates`
5. Find your `chat_id` in the response
6. Add both `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` to secrets

### LinkedIn
1. Go to [LinkedIn Developers](https://www.linkedin.com/developers/)
2. Create an app
3. Request access to "Sign In with LinkedIn"
4. Generate access token with permissions
5. Add to GitHub secrets as `LINKEDIN_ACCESS_TOKEN`

## 🚀 Usage Examples

### Automatic Daily Posts
The workflow automatically generates and posts daily content at 9 AM UTC.

### Manual Trigger
```yaml
# Via GitHub Actions UI
Topic: "New MADGER partnership announcement"
Platforms: "twitter,discord,telegram"
```

### Generate Multiple Variations
```javascript
const ChatGPT = require('./src/services/chatgptIntegration.js');
const chatgpt = new ChatGPT(process.env.OPENAI_API_KEY);

const variations = await chatgpt.generateContentSeries('MADGER moon landing', 5);
console.log(variations.content);
```

### Post to All Platforms
```javascript
const SocialPoster = require('./src/services/socialPoster.js');

const poster = new SocialPoster({
  twitterBearerToken: process.env.TWITTER_BEARER_TOKEN,
  discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL,
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
  telegramChatId: process.env.TELEGRAM_CHAT_ID,
});

const results = await poster.postToAll('🚀 Amazing MADGER news!');
```

## 🔒 Security Best Practices

1. **Never commit API keys** - Always use GitHub secrets
2. **Rotate tokens regularly** - Regenerate API keys periodically
3. **Limit token permissions** - Use minimum required scopes
4. **Monitor usage** - Check OpenAI dashboard for unexpected usage
5. **Keep secrets private** - Don't share tokens in issues or PRs

## 📊 Monitoring

Check workflow results:
1. Go to **Actions → ChatGPT Social Media Posting**
2. Click on a workflow run
3. View logs for each platform

## 🐛 Troubleshooting

### "API key not configured"
- Add `OPENAI_API_KEY` to GitHub Secrets
- Check that the key is valid in OpenAI Dashboard

### "Rate limit exceeded"
- Wait before running again
- Check OpenAI usage on dashboard
- Consider upgrading OpenAI plan

### "Platform not configured"
- Add the platform's API credentials to GitHub Secrets
- Verify webhook URLs/tokens are correct
- Test API credentials directly with curl/Postman

### Content not posting
- Check workflow logs in Actions tab
- Verify all required secrets are set
- Ensure platform APIs are working (check status pages)
- Review ChatGPT content for platform-specific character limits

## 📞 Support

For issues:
1. Check GitHub Actions logs
2. Review OpenAI API status
3. Verify platform API status pages
4. Open an issue in the repository

## 🎯 Next Steps

1. Set up all required API keys
2. Add secrets to GitHub repository
3. Test manual workflow trigger
4. Monitor first automated post
5. Adjust content prompts as needed

---

**Happy posting! 🚀**
