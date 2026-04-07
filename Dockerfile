# Stage 1: install dependencies
FROM node:18-alpine AS deps
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --only=production

# Stage 2: app
FROM node:18-alpine
WORKDIR /usr/src/app
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY . .
# create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser
ENV NODE_ENV=production
# Discord bots don't need ports exposed; keep for health endpoints if you add one
# EXPOSE 3000
CMD ["node", "index.js"]
