FROM node:lts-alpine

WORKDIR /usr/src/site-server

EXPOSE 4420

COPY . .

RUN apk add --update-cache python alpine-sdk

RUN npm ci && npm run build && npm prune --production

ENV NODE_ENV=production

ENTRYPOINT [ "node", "build/server.js" ]
