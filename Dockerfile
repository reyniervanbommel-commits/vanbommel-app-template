# Multi-stage build: bouw frontend en bundel met backend in één container
# Tech debt: --legacy-peer-deps vereist vanwege peer-dep conflict in Fluent UI v9

# Stage 1: Frontend build
FROM node:22-alpine AS frontend-build
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps

ARG VITE_APP_ENV
ENV VITE_APP_ENV=$VITE_APP_ENV

COPY . .
RUN npm run build

# Stage 2: Productie-image
FROM node:22-alpine AS production
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev --legacy-peer-deps

COPY server/ ./server/
COPY scripts/db/ ./scripts/db/

COPY --from=frontend-build /app/dist ./dist

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "server/server.js"]
