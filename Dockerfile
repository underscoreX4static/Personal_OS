FROM node:22-slim

# System deps
RUN apt-get update && apt-get install -y \
  python3 python3-pip python3-venv git curl bash ripgrep \
  && rm -rf /var/lib/apt/lists/*

# Install uv
RUN curl -LsSf https://astral.sh/uv/install.sh | sh
ENV PATH="/root/.local/bin:$PATH"

# Clone and install Hermes manually (non-interactive)
RUN git clone https://github.com/NousResearch/hermes-agent /root/.hermes/hermes-agent

WORKDIR /root/.hermes/hermes-agent

# Install Python 3.11 via uv and create venv
RUN uv python install 3.11 && \
    uv venv --python 3.11 venv && \
    uv sync --all-extras && \
    ls -la /root/.hermes/hermes-agent/venv/bin/

# Create hermes launcher
RUN mkdir -p /root/.local/bin && \
    printf '#!/usr/bin/env bash\nunset PYTHONPATH\nunset PYTHONHOME\nexec "/root/.hermes/hermes-agent/venv/bin/hermes" "$@"\n' > /root/.local/bin/hermes && \
    chmod +x /root/.local/bin/hermes && \
    echo "=== Testing Hermes installation ===" && \
    ls -la /root/.local/bin/hermes && \
    cat /root/.local/bin/hermes

ENV PATH="/root/.local/bin:$PATH"

# Hermes config — minimal, API key injected at runtime via env
RUN mkdir -p /root/.hermes && \
    printf 'model:\n  default: claude-haiku-4-5-20251001\n  provider: anthropic\n  api_key: ""\nagent:\n  max_turns: 50\n  system_prompt_enabled: true\n_config_version: 31\n' > /root/.hermes/config.yaml && \
    printf '# env\n' > /root/.hermes/.env

# Next.js app
WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV HERMES_BIN=/root/.local/bin/hermes
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["npm", "start"]
