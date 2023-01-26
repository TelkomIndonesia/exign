# syntax = docker/dockerfile:1.2

FROM node:18.13.0-slim AS base
RUN apt-get update && apt-get install -y \
  ca-certificates \
  git \
  && rm -rf /var/lib/apt/lists/*



FROM base AS resolver
WORKDIR /src
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/src/node_modules \
    npm install \
    && cp -r node_modules node_modules.bak
RUN rm -rf node_modules && mv node_modules.bak node_modules
COPY . .
ENV NODE_EXTRA_CA_CERTS=/src/config/upstream-transport/ca.crt
ENTRYPOINT [ "./docker-entrypoint.sh" ]
CMD [ "npm", "run", "server-dev" ]



FROM resolver AS builder
RUN npm run build 
RUN npm prune --production



FROM base AS final
WORKDIR /src
COPY --from=builder /src .
ENV NODE_EXTRA_CA_CERTS=/src/config/upstream-transport/ca.crt \
    NODE_ENV=production
ENTRYPOINT [ "./docker-entrypoint.sh" ]