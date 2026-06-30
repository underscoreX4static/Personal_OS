FROM node:22-slim

# System deps
RUN apt-get update && apt-get install -y \
  python3 python3-pip python3-venv git curl bash ripgrep \
  && rm -rf /var/lib/apt/lists/*

# Install uv
RUN curl -LsSf https://astral.sh/uv/install.sh | sh
ENV PATH="/root/.local/bin:$PATH"

# Next.js app dependencies first (for Docker cache)
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Clone and install Hermes IN /app so it persists
RUN git clone https://github.com/NousResearch/hermes-agent /app/.hermes/hermes-agent

WORKDIR /app/.hermes/hermes-agent

# Install Python 3.11 via uv and create venv
RUN uv python install 3.11 && \
    uv venv --python 3.11 venv && \
    uv pip install --python venv -e .

# Verify Hermes binary exists
RUN ls -la /app/.hermes/hermes-agent/venv/bin/ && \
    test -f /app/.hermes/hermes-agent/venv/bin/hermes && \
    echo "✓ Hermes binary found in /app"

# Create hermes launcher in /app
RUN mkdir -p /app/.hermes/bin && \
    printf '#!/usr/bin/env bash\nunset PYTHONPATH\nunset PYTHONHOME\nexec "/app/.hermes/hermes-agent/venv/bin/hermes" "$@"\n' > /app/.hermes/bin/hermes && \
    chmod +x /app/.hermes/bin/hermes

# Test the launcher works
RUN /app/.hermes/bin/hermes --version || echo "Warning: hermes --version failed (might need API key)"

# Copy Hermes config
COPY hermes-config.yaml /app/.hermes/hermes-agent/.hermes/config.yaml

# Copy Next.js app and build
WORKDIR /app
COPY . .
RUN npm run build

# Final verification that Hermes is still there after build
RUN ls -la /app/.hermes/hermes-agent/venv/bin/hermes && \
    ls -la /app/.hermes/bin/hermes && \
    echo "✓ Hermes persisted after Next.js build"

ENV HERMES_BIN=/app/.hermes/bin/hermes
ENV HOME=/app/.hermes/hermes-agent
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["npm", "start"]
