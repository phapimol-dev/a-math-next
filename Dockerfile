FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY server.mjs ./
COPY src ./src

ENV NODE_ENV=production

CMD ["node", "server.mjs"]
