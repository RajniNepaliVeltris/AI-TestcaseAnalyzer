# NPM Scripts Documentation

## Basic Commands

- `npm test` - Run Playwright tests directly
- `npm run build` - Build TypeScript project

## Demo Mode Commands

- `npm run demo` - Run full demo mode with AI analysis and clustering
- `npm run demo:headed` - Run demo with visible browser for presentations
- `npm run demo:report` - Generate AI analysis report for demo runs

## Production Mode Commands

- `npm run prod` - Run full production mode with AI analysis
- `npm run prod:report` - Generate AI analysis report for production runs

## Individual Component Commands

- `npm run analyze` - Run AI failure analysis independently
- `npm run cluster` - Run advanced failure clustering independently
- `npm run report` - Generate basic test report

## Utility Commands

- `npm run setup` - Setup test environment and dependencies
- `npm run ci` - Run production tests with notification
- `npm run notify` - Send Slack notifications for test results

## Usage Examples

For panel demo:
```bash
npm run demo:headed
```

For production deployment:
```bash
npm run prod
```

For quick test report:
```bash
npm run test && npm run report
```