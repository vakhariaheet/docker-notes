FROM oven/bun:1

WORKDIR /app

COPY . .

RUN bun install --frozen-lockfile

EXPOSE 3000:3000

ENTRYPOINT [ "bun","run","src/index.ts" ]