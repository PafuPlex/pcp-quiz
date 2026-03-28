# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This repository is a Docker wrapper for Claude Code CLI. It packages the `@anthropic-ai/claude-code` npm package into an Ubuntu 24.04 container and exposes it as the entrypoint, mounting the host workspace at `/workspace`.

## Common Commands

Uses [Task](https://taskfile.dev) as the task runner (`task` CLI required).

```bash
task build        # Build the Docker image
task run          # Build and run Claude Code interactively (mounts current directory)
task run:shell    # Open bash inside the container for debugging
task run:version  # Check Claude Code version
task clean        # Stop containers and remove image
task logs         # Follow logs of a running container
```

## Architecture

- **Dockerfile** -- Builds the image: installs Node.js LTS + `@anthropic-ai/claude-code` globally, creates a non-root user (`claudeuser`, uid 1001), sets `/workspace` as the working directory, and uses `claude` as the entrypoint.
- **Taskfile.yml** -- Orchestrates Docker build/run commands. The `run` task mounts `{{.PWD}}` to `/workspace`.
