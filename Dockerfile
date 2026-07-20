ARG NODE_IMAGE=node:20-bookworm
ARG PLAYWRIGHT_IMAGE=mcr.microsoft.com/playwright:v1.49.1-jammy

FROM ${NODE_IMAGE} AS deps
WORKDIR /app
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    NPM_CONFIG_REGISTRY=https://registry.npmjs.org/ \
    NPM_CONFIG_AUDIT=false \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_PROGRESS=false
COPY .npmrc package.json package-lock.json ./
RUN npm ci --include=dev --ignore-scripts --no-audit --no-fund \
    && test -x ./node_modules/.bin/prisma

FROM deps AS builder
WORKDIR /app
COPY prisma ./prisma
RUN ./node_modules/.bin/prisma generate
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM ${PLAYWRIGHT_IMAGE} AS runtime
ARG OCI_SOURCE="https://github.com/medinagroup-it/movemgmt-core-ms"
ARG OCI_REVISION="unknown"
ARG OCI_CREATED="unknown"
ARG OCI_VERSION="dev"
LABEL org.opencontainers.image.title="MoveMGMT Core MS" \
      org.opencontainers.image.description="Node.js/Express backend for MoveMGMT" \
      org.opencontainers.image.source="$OCI_SOURCE" \
      org.opencontainers.image.revision="$OCI_REVISION" \
      org.opencontainers.image.created="$OCI_CREATED" \
      org.opencontainers.image.version="$OCI_VERSION" \
      org.opencontainers.image.licenses="UNLICENSED"
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
    STORAGE_ROOT_PATH=/app/storage \
    NPM_CONFIG_REGISTRY=https://registry.npmjs.org/ \
    NPM_CONFIG_AUDIT=false \
    NPM_CONFIG_FUND=false
COPY --from=builder --chown=pwuser:pwuser /app/node_modules ./node_modules
COPY --from=builder --chown=pwuser:pwuser /app/dist ./dist
COPY --from=builder --chown=pwuser:pwuser /app/prisma ./prisma
COPY --from=builder --chown=pwuser:pwuser /app/package.json ./package.json
COPY --from=builder --chown=pwuser:pwuser /app/package-lock.json ./package-lock.json
COPY --from=builder --chown=pwuser:pwuser /app/.npmrc ./.npmrc
RUN mkdir -p /app/storage/documents /app/storage/tmp /app/storage/generated \
    && chown -R pwuser:pwuser /app/storage
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD node -e "fetch('http://127.0.0.1:3000/health/live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
USER pwuser
CMD ["node", "dist/server.js"]
