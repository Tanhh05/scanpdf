FROM node:22-bookworm-slim AS base
LABEL org.opencontainers.image.title="scanpdf-backend"
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl libreoffice-writer poppler-utils ghostscript qpdf tesseract-ocr tesseract-ocr-vie fonts-dejavu ffmpeg \
  && architecture="$(dpkg --print-architecture)" \
  && case "$architecture" in \
       amd64) yt_dlp_asset="yt-dlp_linux" ;; \
       arm64) yt_dlp_asset="yt-dlp_linux_aarch64" ;; \
       *) echo "Unsupported architecture: $architecture" >&2; exit 1 ;; \
     esac \
  && curl --fail --location --retry 3 \
       "https://github.com/yt-dlp/yt-dlp/releases/latest/download/$yt_dlp_asset" \
       --output /usr/local/bin/yt-dlp \
  && chmod 0755 /usr/local/bin/yt-dlp \
  && yt-dlp --version \
  && rm -rf /var/lib/apt/lists/*
ENV YT_DLP_PATH=/usr/local/bin/yt-dlp

COPY package*.json ./
RUN npm install
COPY prisma ./prisma
RUN npx prisma generate
COPY tsconfig.json ./
COPY src ./src
COPY scripts ./scripts
RUN npm run build

CMD ["sh", "scripts/render-start.sh"]
