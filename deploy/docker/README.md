# Local Docker Profile

The MVP local Docker profile runs one service only:

- PostgreSQL

Start it with:

```bash
docker compose -f deploy/docker/compose.yml up -d
```

Stop it with:

```bash
docker compose -f deploy/docker/compose.yml down
```
