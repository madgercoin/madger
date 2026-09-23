FROM node:22-alpine
WORKDIR /app
COPY services/madger-discord-bot/package.json services/madger-discord-bot/package-lock.json ./
RUN npm ci --omit=dev
COPY services/madger-discord-bot/src ./src
USER node
CMD ["sh", "-c", "node src/register-commands.js && exec node src/index.js"]
