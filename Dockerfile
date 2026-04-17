FROM node:20-alpine AS build
WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json package-lock.json ./
RUN npm ci

# Build static assets
COPY . .
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Tiny init + static file server
RUN apk add --no-cache tini \
  && npm install -g serve@14.2.4 \
  && ln -sf "$(npm root -g)/serve/build/main.js" /usr/local/bin/serve \
  && chmod +x /usr/local/bin/serve

# Vite outputs to /dist
COPY --from=build /app/dist ./dist

# Cloud Run provides PORT; default to 8080 for local runs
ENV PORT=8080
EXPOSE 8080

USER node
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["sh", "-c", "exec serve -s dist -l \"tcp://0.0.0.0:${PORT}\""]
