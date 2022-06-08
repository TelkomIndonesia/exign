FROM node:18

WORKDIR /usr/src/app
COPY . .
RUN npm run build 
ENTRYPOINT [ "npm", "run" ]
CMD ["server"]