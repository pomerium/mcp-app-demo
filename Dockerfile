FROM node:lts-alpine

ENV NODE_OPTIONS="--max-old-space-size=4096"

RUN apk add --no-cache python3 make g++ git

WORKDIR /app

COPY package.json package-lock.json .npmrc ./
RUN npm install

COPY *.ts *.json ./
COPY ./public/ ./public/
COPY ./src/ ./src/

RUN npm run build

CMD ["npm", "run", "start"]

