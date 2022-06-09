FROM node:18

WORKDIR /usr/src/app
COPY package.json package-lock.json .
RUN npm run dep
COPY . .
RUN npm run build
ENTRYPOINT [ "npm", "run", "server" ]