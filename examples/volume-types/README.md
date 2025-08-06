# Docker Volume Types Examples

This directory contains examples demonstrating different Docker volume types and their use cases.

## Volume Types Covered

1. **Named Volumes** - Managed by Docker, persistent across container restarts
2. **Bind Mounts** - Direct host filesystem mapping
3. **Anonymous Volumes** - Temporary volumes for container lifetime
4. **tmpfs Mounts** - In-memory storage for sensitive data

## Examples Structure

- `named-volumes/` - Database with persistent named volumes
- `bind-mounts/` - Development app with hot reloading via bind mounts
- `anonymous-volumes/` - Cache app with temporary storage
- `tmpfs-mounts/` - Security app with in-memory secrets
- `multi-volume/` - Complex app using multiple volume types

Each example includes:
- Dockerfile
- docker-compose.yml
- Source code
- Documentation