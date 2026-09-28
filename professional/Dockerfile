FROM node:26-alpine AS build
WORKDIR /src
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM caddy:2-alpine
EXPOSE 5005
WORKDIR /app
COPY --from=build /src/dist /app
COPY Caddyfile /app/Caddyfile
CMD ["caddy", "run", "--config", "Caddyfile"]
