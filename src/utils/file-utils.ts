import * as fs from 'fs';
import * as path from 'path';

export function ensureResultsFile(filePath: string): void {
    const dirPath = path.dirname(filePath);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
    
    // Create results file with empty structure if it doesn't exist
    if (!fs.existsSync(filePath)) {
        const initialResults = {
            suites: []
        };
        fs.writeFileSync(filePath, JSON.stringify(initialResults, null, 2));
    }
}