FROM node:lts-slim

WORKDIR /usr/src/site-server

EXPOSE 4420

COPY . .

RUN npm install && npm run build

#CMD [ "node", "build/server.js" ]