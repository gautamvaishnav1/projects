# ---- build stage ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig*.json ./
COPY src ./src
RUN npx tsc -p tsconfig.build.json

# ---- runtime stage ----
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://localhost:5000/health || exit 1
CMD ["node", "dist/server.js"]
