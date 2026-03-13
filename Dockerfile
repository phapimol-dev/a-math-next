FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY server.mjs ./
COPY src ./src

# Ensure Next is not required for the pure backend if we only run server.mjs
# But here server.mjs imports from src/lib which is fine.

EXPOSE 3000

ENV NODE_ENV=production

CMD ["node", "server.mjs"]
