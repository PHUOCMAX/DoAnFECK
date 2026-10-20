
FROM node:22-alpine AS builder

WORKDIR /app

COPY frontend/web/package*.json ./
RUN npm ci

COPY frontend/web/ ./frontend/web/
COPY shared/ ./shared/

WORKDIR /app/frontend/web

ARG VITE_MAPTILER_KEY
ENV VITE_MAPTILER_KEY=${VITE_MAPTILER_KEY}

RUN npm run build

FROM nginx:alpine

COPY --from=builder /app/frontend/web/dist /usr/share/nginx/html
COPY frontend/web/nginx/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
