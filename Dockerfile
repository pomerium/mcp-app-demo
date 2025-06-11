# using slim instead of alpine for better compatibility with optional dependencies
FROM node:lts-slim

ENV NODE_OPTIONS="--max-old-space-size=4096"

RUN apt-get update && apt-get install -y python3 make g++ git && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json .npmrc ./
RUN npm install

COPY *.ts *.json ./
COPY ./public/ ./public/
COPY ./src/ ./src/

RUN npm run build

CMD ["npm", "run", "start"]

