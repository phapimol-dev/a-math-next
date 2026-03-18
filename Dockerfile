FROM node:20-alpine

WORKDIR /app

# Install all dependencies (including devDependencies for build)
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build Next.js
RUN npm run build

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["node", "server.mjs"]

