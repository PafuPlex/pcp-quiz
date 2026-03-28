FROM node:lts-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY vite.config.js ./
COPY src ./src

RUN npm run build


FROM node:lts-alpine AS runtime

ENV NODE_ENV=production

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src/server.js ./src/server.js
COPY --from=builder /app/dist ./public

RUN mkdir -p /app/data && chown node:node /app/data
ENV DB=/app/data

USER node

EXPOSE 3000

CMD ["node", "src/server.js"]
