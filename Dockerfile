# order_bread - server 폴더 기준 빌드
FROM node:18
WORKDIR /app
COPY server/package*.json ./
RUN npm ci --omit=dev
COPY server/ ./
EXPOSE 3000
CMD ["npm", "start"]
