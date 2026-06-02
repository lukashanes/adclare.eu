# Project Governance

Adclare is an open source project maintained from the official repository:

https://github.com/lukashanes/adclare.eu

The project is licensed under EUPL-1.2. Forks and downstream deployments are welcome, but the official downloadable version is always the version published from this repository by the repository owner or maintainers explicitly authorized by the owner.

## Roles

- **Owner**: controls the repository, official releases, protected branches and release tags.
- **Maintainers**: may review pull requests, triage issues and help prepare releases when authorized by the owner.
- **Collaborators**: may contribute branches, pull requests, issue triage, documentation and reviews according to their repository permission.
- **Contributors**: may open issues and pull requests from forks.

## Official Version

The official version is defined by:

- the `main` branch in `lukashanes/adclare.eu`,
- release tags named `v*`,
- GitHub Releases published in `lukashanes/adclare.eu`,
- release notes and changelog files in this repository.

Forks can publish their own builds, but those builds are not official Adclare releases unless the repository owner explicitly says so.

## Contribution Flow

1. Open an issue for larger changes or unclear product decisions.
2. Create a branch or fork.
3. Open a pull request against `main`.
4. Wait for CI and review.
5. Maintainers merge accepted changes through the protected branch workflow.

Direct pushes to `main` and release tags are restricted by repository rules. This keeps the public downloadable version traceable and controlled.

## Release Flow

1. Update `CHANGELOG.md` and release notes.
2. Confirm CI and Docker build checks are green.
3. Create a `v*` tag from `main`.
4. Publish the GitHub Release from the official repository.

Only official releases from `lukashanes/adclare.eu` should be presented as the current public Adclare version.
