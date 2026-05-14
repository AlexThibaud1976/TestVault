# @atconseil/argos-cli

Command-line interface for [Argos](https://github.com/AlexThibaud1976/TestVault) --
industrial-grade test management for Azure DevOps.

## Installation

```bash
# One-shot (recommended)
npx @atconseil/argos-cli <command>

# Global install
npm install -g @atconseil/argos-cli
argos <command>
```

## Commands

### `argos install`

Install Argos Custom WIT into an Azure DevOps process via Custom Process Inheritance.

```bash
npx @atconseil/argos-cli install \
  --org-url https://dev.azure.com/myorg \
  --project "My Project" \
  --pat <YOUR_PAT>
```

#### Options

| Flag | Default | Description |
|------|---------|-------------|
| `--org-url <url>` | (required, or `ARGOS_ORG_URL` env var) | ADO organisation URL |
| `--org <url>` | | Alias for `--org-url` |
| `--project <name>` | (required, or `ARGOS_PROJECT` env var) | ADO project name |
| `--pat <token>` | (required, or `ARGOS_PAT` env var) | Personal Access Token with `Process (Read & manage)` scope |
| `--base-process <type>` | `Agile` | Base process: `Agile`, `Scrum`, `CMMI` |
| `--process-name <name>` | `Argos Inherited` | Name of the new custom process |
| `--no-prompt` | (interactive) | Non-interactive mode (CI) |
| `--skip-confirm` | (confirm prompt) | Skip confirmation prompt |

#### PAT scope required

Generate a PAT at `https://dev.azure.com/<org>/_usersSettings/tokens` with scope:
- **Project and Team (Process Read & manage)**
- OR full access (less secure)

#### Cohabitation with Microsoft Test Plans

Argos uses Custom WIT prefixed with `TestVault.*`. These coexist with native
Microsoft Test Plan WIT (`Microsoft.TestPlan.*`). No conflict.

#### Behaviour by detection state

- **Not installed**: creates new Custom Process Inheritance, installs 7 WIT
- **Partial**: missing WIT types added to existing process (idempotent)
- **Already installed (matching schema)**: no-op
- **Already installed (different schema)**: schema update prompted

#### Exit codes

- `0`: success
- `1`: missing required options
- `2`: detection failed (network/auth)
- `3`: install failed (permissions/conflicts)

### `argos auth login` (existing)

Verify PAT credentials.

### `argos tc ...` (existing)

Manage Test Cases.

## Environment variables

| Variable | Equivalent flag |
|----------|----------------|
| `ARGOS_ORG_URL` | `--org-url` |
| `ARGOS_PROJECT` | `--project` |
| `ARGOS_PAT` | `--pat` |

## License

Apache-2.0

## Links

- [Argos extension on Marketplace](https://marketplace.visualstudio.com/items?itemName=AlexThibaud.ArgosTesting)
- [Argos documentation](https://github.com/AlexThibaud1976/TestVault)
- [Report issues](https://github.com/AlexThibaud1976/TestVault/issues)
