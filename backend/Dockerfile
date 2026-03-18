FROM node:20-alpine AS base
WORKDIR /app
COPY package.json ./

FROM base AS development
RUN npm install
COPY . .
RUN npx prisma generate
EXPOSE 3001
CMD ["npm", "run", "start:dev"]

FROM base AS builder
RUN npm install
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
COPY package.json ./
RUN npm install --only=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma        ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma        ./node_modules/@prisma
COPY --from=builder /app/prisma                      ./prisma
RUN mkdir -p /app/uploads
EXPOSE 3001
CMD ["node", "dist/main"]
