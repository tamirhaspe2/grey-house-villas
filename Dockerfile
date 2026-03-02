FROM node:22-bullseye-slim

WORKDIR /app

# install python and make for sqlite3 compilation if needed
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

ENV PORT=8080
ENV NODE_ENV=production
EXPOSE 8080

CMD ["npx", "tsx", "server.ts"]
