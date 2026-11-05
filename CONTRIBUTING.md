# Contributing to Shelf2Cash

Thanks for helping improve Shelf2Cash, a physical-to-financial intelligence platform for kirana retailers. This document covers setup, conventions, and pull-request expectations.

## Code of Conduct

By participating, you agree to follow [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Report unacceptable behavior to ishan.vaidya01@gmail.com.

## Getting Started

1. Fork the repository and clone your fork.
2. Follow the setup instructions in [README.md](README.md#quick-start-local-development) — MongoDB, Node.js 18+, and Python 3.9+ are required.
3. Seed the database so you have realistic data to work with.
4. Create a branch from `main`:

   ```bash
   git checkout -b feat/mesh-matchmaking-ranking
   # or
   git checkout -b fix/forecast-rounding
   ```

## Development Checks

Run these before opening a pull request:

- Backend: start the Node API and exercise the affected endpoints via the seeded data.
- ML service: install `ml-service/requirements.txt` and verify forecast endpoints respond with expected schemas.
- Frontend: build the Vite app (`npm run build`) and lint with the configured tooling.
- Confirm the app still runs end to end with external API keys **absent** (mock fallbacks must keep working).

## Commit Convention

Use [Conventional Commits](https://www.conventionalcommits.org/):

```text
feat: rank surplus-shortage matches by proximity and urgency
fix: round cash-flow projections consistently across screens
refactor: extract inventory valuation into a shared service
docs: document the Kirana Mesh data model
chore: bump frontend dependencies
```

The subject should be in the imperative mood and under ~72 characters.

## Coding Guidelines

- Keep the three services independent: frontend, Node backend, Python ML service.
- Backend business logic belongs behind the service layer, not in route handlers.
- ML endpoints must return stable, typed response schemas the backend can rely on.
- Geospatial queries must use the existing 2dsphere indexes.
- Never commit `.env` files, API keys, or database dumps.

## Pull Request Checklist

- [ ] The change is focused on one problem.
- [ ] All three services start and the affected flows were exercised.
- [ ] Mock fallbacks still function without external API keys.
- [ ] New environment variables are documented in `backend/.env.example` and the README.
- [ ] The PR description explains the change, motivation, and how it was tested.
- [ ] Screenshots are attached for UI changes.

## Reporting Bugs and Requesting Features

Use the GitHub issue templates. Include steps to reproduce, expected vs. actual behavior, and environment details.

## Security

Do not open public issues for security problems. Follow [SECURITY.md](SECURITY.md).

## License

By contributing, you agree that your contributions are licensed under the project's [MIT License](LICENSE).
