# NPM Scripts Documentation

## Basic Commands

- `npm test` - Run Playwright tests directly
- `npm run test:headed` - Run tests with visible browser
- `npm run test:debug` - Run tests in debug mode
- `npm run test:unit` - Run unit tests only
- `npm run test:unit:watch` - Run unit tests in watch mode
- `npm run test:unit:coverage` - Run unit tests with coverage report
- `npm run test:all` - Run both unit and integration tests

## Build Commands

- `npm run build` - Build TypeScript project
- `npm run build:watch` - Build in watch mode
- `npm run clean` - Clean build artifacts
- `npm run type-check` - Run TypeScript type checking

## Production Commands

- `npm run prod` - Run full production pipeline (build + test + analyze)
- `npm run prod:report` - Generate AI analysis report only
- `npm run prod:full` - Clean build and run full production pipeline
- `npm run ci` - Run CI/CD pipeline

## Individual Component Commands

- `npm run analyze` - Run AI failure analysis independently
- `npm run cluster` - Run advanced failure clustering independently
- `npm run report` - Generate basic test report

## Development Commands

- `npm run lint` - Run ESLint for code quality
- `npm run lint:fix` - Auto-fix ESLint issues
- `npm run playwright:install` - Install Playwright browsers

## Usage Examples

### For Development
```bash
# Quick test run
npm test

# Full development cycle
npm run build && npm run test:all

# Watch mode development
npm run build:watch &
npm run test:unit:watch
```

### For Production
```bash
# Full production deployment
npm run prod

# CI/CD pipeline
npm run ci
```

### For Debugging
```bash
# Debug tests with visible browser
npm run test:headed

# Debug specific test
npm run test:debug -- --grep "specific test"
```

### For Analysis
```bash
# Generate analysis report
npm run prod:report

# Run individual components
npm run analyze
npm run cluster
```

## Script Dependencies

- **test**: Depends on Playwright browsers being installed
- **prod**: Requires AI API keys in environment variables
- **build**: Requires TypeScript compiler
- **lint**: Requires ESLint configuration

## Environment Variables

Required for production mode:
- `OPENAI_API_KEY` - OpenAI API key
- `TOGETHER_API_KEY` - TogetherAI API key (optional fallback)
- `NODE_ENV` - Set to 'production' for prod scripts

## Troubleshooting

### Common Issues

1. **"Command not found"**: Run `npm install` first
2. **"Browser not found"**: Run `npm run playwright:install`
3. **"API key missing"**: Set environment variables in `.env.prod`
4. **"Build failed"**: Run `npm run type-check` to see TypeScript errors
5. **"Tests timeout"**: Use `npm run test:headed` for debugging

### Performance Tips

- Use `npm run test -- --workers 4` for parallel execution
- Use `npm run test:unit:coverage` to identify slow tests
- Use `npm run build:watch` during development to avoid full rebuilds