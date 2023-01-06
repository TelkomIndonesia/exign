FROM node:18-alpine AS builder

WORKDIR /src
COPY package.json package-lock.json ./
RUN npm install
COPY . .
RUN npm run build



FROM node:18-alpine
RUN apk add --no-cache bash curl ca-certificates git
WORKDIR /src
COPY --from=builder /src .
ENTRYPOINT [ "npm", "run", "server" ]