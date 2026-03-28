FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    curl \
    git \
    ripgrep \
    ca-certificates \
    gnupg \
    && curl -fsSL https://deb.nodesource.com/setup_lts.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# npm global install puts claude in /usr/bin — available to all users
RUN npm install -g @anthropic-ai/claude-code

RUN useradd -m -u 1001 -s /bin/bash claudeuser

RUN mkdir -p /home/claudeuser/.claude && chown claudeuser:claudeuser /home/claudeuser/.claude

WORKDIR /workspace
RUN chown claudeuser:claudeuser /workspace

USER claudeuser

ENTRYPOINT ["claude"]