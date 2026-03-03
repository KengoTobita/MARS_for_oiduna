# MARS for Oiduna

TypeScript-based DSL client for the Oiduna livecoding engine.

## Architecture

- **Language**: TypeScript 5.x
- **Parser**: ANTLR4 (antlr4ts)
- **Backend**: Hono
- **Frontend**: Vanilla TypeScript SPA
- **Editor**: Monaco Editor

## Project Structure

```
MARS_for_oiduna/
├── grammar/              # ANTLR4 DSL grammar
├── src/
│   ├── shared/          # Shared code (parser, compiler, types)
│   ├── server/          # Hono backend
│   └── frontend/        # Vanilla TS SPA
├── docs/                # Documentation
├── examples/            # Sample projects
└── tests/               # Tests
```

## Getting Started

### Prerequisites

- Node.js 20+ or Bun
- ANTLR4 CLI
- Running Oiduna instance

### Installation

```bash
# Install dependencies
npm install
# or
bun install

# Generate ANTLR4 parser
npm run antlr4
```

### Development

```bash
# Start frontend dev server
npm run dev

# Start backend server (in another terminal)
npm run dev:server
```

### Build

```bash
npm run build
```

## Documentation

See [docs/README.md](docs/README.md) for detailed documentation.

## License

MIT
