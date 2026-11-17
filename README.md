# Generate Magento Version Matrix for Data Artifacts

A GitHub Action that dynamically generates build matrices of Magento releases and companion container image configurations for CI/CD pipelines. It queries Magento release metadata from [Magento Watch](https://magento.watch/), filters versions by release age and lifecycle status, normalizes minimum service requirements, and outputs ready-to-use JSON matrices for building Magento data artifacts and Testcontainers/Docker data images.

## Overview

During execution, this action:

1. Fetches Magento release metadata from `version-api-url` (defaults to `https://magento.watch/api/v1/magento-community/versions`).
2. Sorts releases in ascending semantic version order and filters them based on the configured inputs:
   - **Release window (`months`)**: Keeps only releases published within the last `months * 30` days.
   - **End-of-Life (`include-eol`)**: Excludes EOL versions unless `include-eol: 'true'`.
   - **Pre-releases (`include-prerelease`)**: Excludes upcoming/pre-release versions (`alpha`, `beta`, `rc`) unless `include-prerelease: 'true'`.
   - **System requirements**: Skips legacy releases that do not define MySQL system requirements.
3. Normalizes required service versions (`php`, `mariadb`, `mysql`, `opensearch`) for each release to the **lowest supported `<major>.<minor>` version** (for example, `["8.3", "8.4"]` resolves to `"8.3"` and `["3"]` resolves to `"3.0"`).
4. Expands artifact variations for each matched version:
   - Standard build (`<version>`, `sampleData: false`).
   - Sample data build (`<version>-sampledata`, `sampleData: true`) when `sample-data: 'true'`.
5. Exports two JSON-serialized arrays as action outputs:
   - `builds` — Matrix entries tailored for [`ecomdev/action-build-magento-data-artifact`](https://github.com/EcomDev/action-build-magento-data-artifact).
   - `images` — Matrix entries for building `mysql`, `mariadb`, `opensearch`, and `media` data container images, with `docker/metadata-action`-compatible tag rules (`type=raw,value=<tag>`) and automatic `latest` / `latest-sampledata` tags for the latest stable Magento release.

## Usage

### Basic Example

```yaml
name: Build Magento Matrix

on:
  workflow_dispatch:
  schedule:
    - cron: '0 3 * * 1'

jobs:
  matrix:
    runs-on: ubuntu-latest
    outputs:
      builds: ${{ steps.generate.outputs.builds }}
      images: ${{ steps.generate.outputs.images }}
    steps:
      - name: Generate Magento Version Matrix
        id: generate
        uses: ecomdev/action-build-magento-matrix@v1
        with:
          months: '24'
          namespace: ecomdev/testcontainer-magento-data
```

### End-to-End Pipeline with Data Artifacts and Container Images

Every item in the `builds` output maps directly to the inputs of [`ecomdev/action-build-magento-data-artifact`](https://github.com/EcomDev/action-build-magento-data-artifact), while `images` provides the corresponding matrix for packaging those artifacts into Docker images:

```yaml
name: Build Magento Data Images

on:
  workflow_dispatch:
  push:
    branches: [main]

jobs:
  prepare-matrix:
    runs-on: ubuntu-latest
    outputs:
      builds: ${{ steps.matrix.outputs.builds }}
      images: ${{ steps.matrix.outputs.images }}
    steps:
      - name: Generate Magento Matrix
        id: matrix
        uses: ecomdev/action-build-magento-matrix@v1
        with:
          months: '24'
          namespace: ecomdev/testcontainer-magento-data
          sample-data: 'true'
          include-prerelease: 'true'

  build-artifacts:
    needs: prepare-matrix
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        build: ${{ fromJSON(needs.prepare-matrix.outputs.builds) }}
    steps:
      - name: Build Magento Data Artifact (${{ matrix.build.name }})
        uses: ecomdev/action-build-magento-data-artifact@v1
        with:
          name: ${{ matrix.build.name }}
          magento-version: ${{ matrix.build.magentoVersion }}
          php-version: ${{ matrix.build.phpVersion }}
          mariadb-version: ${{ matrix.build.mariaDbVersion }}
          opensearch-version: ${{ matrix.build.openSearchVersion }}
          sample-data: ${{ matrix.build.sampleData }}
          stability: ${{ matrix.build.stability }}

  build-images:
    needs: [prepare-matrix, build-artifacts]
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        image: ${{ fromJSON(needs.prepare-matrix.outputs.images) }}
    steps:
      - uses: actions/checkout@v7

      - name: Download Data Artifact (${{ matrix.image.artifact }})
        uses: actions/download-artifact@v8
        with:
          name: ${{ matrix.image.artifact }}
          path: ./artifact

      - name: Extract Docker Metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ecomdev/testcontainer-magento-data-${{ matrix.image.containerType }}
          tags: ${{ matrix.image.tag }}

      - name: Build and Push Container Image
        uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          build-args: |
            CONTAINER_TYPE=${{ matrix.image.containerType }}
            SERVICE_VERSION=${{ matrix.image.version }}
```

### Including Pre-Release, EOL, and Sample Data Variations

```yaml
      - name: Generate Extended Magento Matrix
        id: matrix
        uses: ecomdev/action-build-magento-matrix@v1
        with:
          months: '36'
          namespace: ecomdev/testcontainer-magento-data
          include-prerelease: 'true'
          include-eol: 'true'
          sample-data: 'true'
          version-api-url: https://magento.watch/api/v1/magento-community/versions
```

## Inputs

| Input | Required | Default | Description |
| --- | :---: | --- | --- |
| `months` | **Yes** | — | Maximum age of Magento releases in months (`months * 30` days from the current date) to include in the matrix. |
| `namespace` | **Yes** | — | Container image namespace for generated Docker images (e.g., `ecomdev/testcontainer-magento-data`). |
| `version-api-url` | No | `https://magento.watch/api/v1/magento-community/versions` | API endpoint returning Magento release metadata and system requirements in Magento Watch v1 JSON format. |
| `include-prerelease` | No | `'false'` | Include upcoming/pre-release versions such as `alpha`, `beta`, and `rc` (`'true'` / `'false'`). |
| `include-eol` | No | `'false'` | Include End-of-Life (EOL) Magento versions that fall within the `months` window (`'true'` / `'false'`). |
| `sample-data` | No | `'false'` | Generate an additional `-sampledata` variation for every matched Magento release (`'true'` / `'false'`). |

## Outputs

| Output | Description |
| --- | --- |
| `builds` | JSON-serialized array of artifact build configurations for [`ecomdev/action-build-magento-data-artifact`](https://github.com/EcomDev/action-build-magento-data-artifact). |
| `images` | JSON-serialized array of container image build configurations (`mysql`, `mariadb`, `opensearch`, and `media`) with tag definitions. |

### `builds` Output Format

Each element in the `builds` JSON array has the following properties:

| Property | Type | Description |
| --- | --- | --- |
| `name` | `string` | Unique artifact name (`<magentoVersion>` or `<magentoVersion>-sampledata`). |
| `magentoVersion` | `string` | Magento release version (e.g., `'2.4.9'`, `'2.4.8-p4'`, `'2.4.10-alpha1'`). |
| `phpVersion` | `string` | Minimum supported PHP `<major>.<minor>` version (e.g., `'8.3'`). |
| `mariaDbVersion` | `string` | Minimum supported MariaDB `<major>.<minor>` version (e.g., `'11.4'`). |
| `openSearchVersion` | `string` | Minimum supported OpenSearch `<major>.<minor>` version (e.g., `'3.0'`). |
| `sampleData` | `boolean` | Whether sample data should be installed (`false` or `true`). |
| `stability` | `string` | Composer package stability: `'alpha'` for pre-release versions, `'stable'` otherwise. |

Example `builds` payload (formatted for readability):

```json
[
  {
    "name": "2.4.9",
    "magentoVersion": "2.4.9",
    "phpVersion": "8.5",
    "mariaDbVersion": "11.8",
    "openSearchVersion": "3.0",
    "sampleData": false,
    "stability": "stable"
  },
  {
    "name": "2.4.9-sampledata",
    "magentoVersion": "2.4.9",
    "phpVersion": "8.5",
    "mariaDbVersion": "11.8",
    "openSearchVersion": "3.0",
    "sampleData": true,
    "stability": "stable"
  },
  {
    "name": "2.4.10-alpha1",
    "magentoVersion": "2.4.10-alpha1",
    "phpVersion": "8.5",
    "mariaDbVersion": "12.3",
    "openSearchVersion": "3.7",
    "sampleData": false,
    "stability": "alpha"
  }
]
```

### `images` Output Format

For each generated artifact, the action emits 4 container image definitions (`mysql`, `mariadb`, `opensearch`, and `media`). When a version is marked as the latest release (`isLatestVersion: true`), 4 additional entries are emitted with the `latest` tag (and 4 more with `latest-sampledata` when `sample-data: 'true'`).

| Property | Type | Description |
| --- | --- | --- |
| `artifact` | `string` | Source data artifact name matching `builds[].name` (e.g., `'2.4.9'`, `'2.4.9-sampledata'`). |
| `tag` | `string` | Raw tag expression formatted for `docker/metadata-action` (e.g., `'type=raw,value=2.4.9'`, `'type=raw,value=latest'`). |
| `containerType` | `string` | Target data container type: `'mysql'`, `'mariadb'`, `'opensearch'`, or `'media'`. |
| `version` | `string` | Minimum supported `<major>.<minor>` version for the service, or `'none'` when `containerType` is `'media'`. |

Example `images` payload for a latest release:

```json
[
  {
    "artifact": "2.4.9",
    "tag": "type=raw,value=2.4.9",
    "containerType": "mysql",
    "version": "8.4"
  },
  {
    "artifact": "2.4.9",
    "tag": "type=raw,value=2.4.9",
    "containerType": "mariadb",
    "version": "11.8"
  },
  {
    "artifact": "2.4.9",
    "tag": "type=raw,value=2.4.9",
    "containerType": "opensearch",
    "version": "3.0"
  },
  {
    "artifact": "2.4.9",
    "tag": "type=raw,value=2.4.9",
    "containerType": "media",
    "version": "none"
  },
  {
    "artifact": "2.4.9",
    "tag": "type=raw,value=latest",
    "containerType": "mysql",
    "version": "8.4"
  },
  {
    "artifact": "2.4.9",
    "tag": "type=raw,value=latest",
    "containerType": "mariadb",
    "version": "11.8"
  },
  {
    "artifact": "2.4.9",
    "tag": "type=raw,value=latest",
    "containerType": "opensearch",
    "version": "3.0"
  },
  {
    "artifact": "2.4.9",
    "tag": "type=raw,value=latest",
    "containerType": "media",
    "version": "none"
  }
]
```

## Requirements

- **Node.js Runtime**: Executed via GitHub Actions `node24` runtime.
- **Network Access**: Outbound HTTPS access from the runner to `version-api-url` (`magento.watch` by default).

## Development

### Install Dependencies

```bash
npm clean-install
```

### Run Unit Tests

```bash
npm test
```

### Bundle Action (`dist/`)

Whenever files under `src/` are modified, rebuild the bundled distribution (`dist/index.cjs`) and third-party license file (`dist/licenses.txt`). CI verifies that `dist/` stays in sync with `src/`:

```bash
npm run build
```

### Run Action Locally

You can execute and inspect the action locally using [`@github/local-action`](https://github.com/github/local-action):

1. Copy `.env.example` to `.env` and configure the `INPUT_*` environment variables (note that `@github/local-action` does not automatically populate defaults from `action.yml`, so keep `INPUT_VERSION-API-URL` and `INPUT_MONTHS` set in `.env`):

   ```dotenv
   INPUT_VERSION-API-URL=https://magento.watch/api/v1/magento-community/versions
   INPUT_MONTHS=24
   INPUT_INCLUDE-PRERELEASE=false
   INPUT_INCLUDE-EOL=false
   INPUT_SAMPLE-DATA=false
   GITHUB_WORKSPACE=./
   ```

2. Run the action:

   ```bash
   npx @github/local-action ./ ./src/main.ts .env
   ```

## License

Licensed under the [Apache License, Version 2.0](./LICENSE). Copyright © EcomDev B.V.
