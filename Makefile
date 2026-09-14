.PHONY: setup dev test test-db lint lint-fix typecheck build clean migrate openapi docker-build docker-up docker-down help

setup: ## Install dependencies
	pnpm install

dev: ## Run the API with hot reload
	pnpm run dev

test: ## Run unit and API tests (Postgres tests run when DATABASE_URL is set)
	pnpm run test

test-db: ## Run tests against the docker compose database
	DATABASE_URL=postgres://reconcile:reconcile@localhost:5432/reconcile pnpm run test

lint: ## Lint and check formatting
	pnpm run lint

lint-fix: ## Fix lint and formatting issues
	pnpm run lint:fix

typecheck: ## Type-check every package
	pnpm run typecheck

build: ## Build every package
	pnpm run build

clean: ## Remove build output
	pnpm run clean

migrate: ## Apply database migrations (requires DATABASE_URL)
	pnpm run migrate

openapi: ## Regenerate docs/api/openapi.json
	pnpm run openapi

docker-build: ## Build the API container image
	docker build -f backend/Dockerfile -t stellar-reconcile-api:local .

docker-up: ## Start API + PostgreSQL
	docker compose up --build

docker-down: ## Stop docker compose services
	docker compose down

help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-16s\033[0m %s\n", $$1, $$2}'
