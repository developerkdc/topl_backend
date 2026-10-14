# TOPL Backend – Branch & CI/CD Configuration By Yash

## Overview

This repository maintains the TOPL backend application and its CI/CD deployment configuration for Development, UAT, and Client environments.

## Branch and Environment Mapping

| Git Branch | Environment   | Deployment Target       | CI/CD Configuration | Status             |
| ---------- | ------------- | ----------------------- | ------------------- | ------------------ |
| `staging`  | Development   | `toplbe.dev.metaphi.in` | `staging.yml`       | Configured         |
| `mipl_uat` | UAT           | `toplbe.uat.metaphi.in` | `mipl_uat.yml`      | Configured         |
| `main`     | Client / Live | Client Server           | `main.yml`          | Not yet configured |

## CI/CD Workflow Configuration

### 1. Development Environment

* **Branch:** `staging`
* **Deployment URL:** https://toplbe.dev.metaphi.in
* **Workflow file:** `staging.yml`
* **Status:** Configured
* **Purpose:** Deploys the backend application to the Development environment.

### 2. UAT Environment

* **Branch:** `mipl_uat`
* **Deployment URL:** https://toplbe.uat.metaphi.in
* **Workflow file:** `mipl_uat.yml`
* **Status:** Configured
* **Purpose:** Deploys the backend application to the UAT environment for testing and validation.

### 3. Client / Live Environment

* **Branch:** `main`
* **Deployment target:** Client Server
* **Workflow file:** `main.yml`
* **Status:** Pending configuration
* **Purpose:** Intended to deploy the backend application to the live client environment.

The `main.yml` workflow has not yet been created or configured.

## Deployment Flow

```text
staging
   |
   v
Development
toplbe.dev.metaphi.in
   |
   | staging.yml


mipl_uat
   |
   v
UAT
toplbe.uat.metaphi.in
   |
   | mipl_uat.yml


main
   |
   v
Client Server (Live)
   |
   | main.yml
   | Pending configuration
```

## Important Guidelines

1. Use the appropriate branch for the target environment.
2. Keep Development, UAT, and Client deployment configurations separate.
3. Verify the branch triggers and deployment targets before modifying workflow files.
4. Do not expose secrets, credentials, or sensitive environment variables in the repository.
5. Test changes in Development and UAT before deploying to the live client environment.
6. Configure `main.yml` only after the required client server details and deployment requirements are confirmed.

## Notes

* `staging.yml` is used for Development deployment.
* `mipl_uat.yml` is used for UAT deployment.
* `main.yml` is pending creation and configuration for the Client / Live environment.
