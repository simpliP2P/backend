migrate :
	@echo "Creating migration..."
	@npm run typeorm migration:generate -- -d ./src/Database/data-source.ts ./src/Database/migrations/${name}
