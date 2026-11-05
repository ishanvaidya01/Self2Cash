# Security Policy

## Supported Versions

| Version | Supported |
| --- | --- |
| `main` (latest commit) | Yes |
| Older commits / tags | No |

Shelf2Cash is a hackathon project maintained on a best-effort basis. Security fixes are applied to the latest `main` branch.

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Use one of the following private channels:

1. **GitHub Security Advisories** — open a private report from the repository's *Security* tab.
2. **Email** — [ishan.vaidya01@gmail.com](mailto:ishan.vaidya01@gmail.com) with the subject `[Shelf2Cash Security]`.

Please include a description, reproduction steps or proof of concept, and the affected service (frontend, Node backend, ML microservice).

## Scope

In scope:

- Authentication, authorization, and cross-account data access between stores.
- Price/quantity tampering, order validation, and financial calculation flaws.
- Injection and unsafe handling of untrusted input in the backend or ML service.
- Leakage of API keys through the application or repository.

Out of scope:

- Denial of service through extreme traffic.
- Issues in third-party dependencies that are already publicly known.
- Findings that require physical access to an unlocked device or hosting account.

## Disclosure Policy

Once a fix is available, the maintainer will publish a patched version and credit the reporter unless anonymity is requested.
