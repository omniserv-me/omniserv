# export environment variables from the .env file, if it exists
-include .env
export

test:
	docker compose up -d --build --wait