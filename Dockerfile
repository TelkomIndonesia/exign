FROM serjs/go-socks5-proxy AS socks5



FROM node:18-alpine AS builder

WORKDIR /src
COPY package.json package-lock.json ./
RUN npm install
COPY . .
RUN npm run build



FROM node:18-alpine
RUN apk add --no-cache bash dnsmasq curl openssl ca-certificates git
WORKDIR /src
COPY --from=socks5 /socks5 /bin/socks5
COPY --from=builder /src .
ENTRYPOINT [ "npm", "run", "server" ]