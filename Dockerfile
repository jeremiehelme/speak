# Build stage - client
FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Build stage - server
FROM node:20-alpine AS server-build
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci
COPY server/ ./
RUN npx tsc

# Production
FROM node:20-alpine
WORKDIR /app

COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci --omit=dev

COPY --from=server-build /app/server/dist ./server/dist
COPY --from=client-build /app/client/dist ./client/dist
COPY prompts/ ./prompts/

RUN mkdir -p data

ENV PORT=3000
ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "server/dist/index.js"]
