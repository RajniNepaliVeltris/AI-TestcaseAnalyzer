export function formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

export function calculateTrendIndicator(currentValue: number, previousValue: number): string {
    const percentageChange = previousValue === 0 ? 0 : ((currentValue - previousValue) / previousValue) * 100;
    
    if (Math.abs(percentageChange) < 5) {
        return 'stable';
    }
    return percentageChange > 0 ? 'increasing' : 'decreasing';
}

export function formatDuration(seconds: number): string {
    if (seconds < 60) {
        return `${seconds.toFixed(1)}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = (seconds % 60).toFixed(1);
    return `${minutes}m ${remainingSeconds}s`;
}

export function generateChartColors(count: number): string[] {
    const baseColors = [
        '#1976d2', '#dc004e', '#388e3c', '#f57c00', '#7b1fa2',
        '#0097a7', '#d32f2f', '#689f38', '#ffa000', '#5c6bc0'
    ];
    
    if (count <= baseColors.length) {
        return baseColors.slice(0, count);
    }

    // Generate additional colors if needed
    const colors = [...baseColors];
    while (colors.length < count) {
        const hue = (colors.length * 137.5) % 360;
        colors.push(`hsl(${hue}, 70%, 50%)`);
    }
    
    return colors;
}

export function generateChartGradient(ctx: CanvasRenderingContext2D, color: string): CanvasGradient {
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0.1)');
    return gradient;
}

export function smoothData(data: number[], windowSize: number = 7): number[] {
    return data.map((val, idx) => {
        const start = Math.max(0, idx - Math.floor(windowSize / 2));
        const end = Math.min(data.length, idx + Math.floor(windowSize / 2) + 1);
        const window = data.slice(start, end);
        return window.reduce((sum, val) => sum + val, 0) / window.length;
    });
}

export function generateTimeLabels(hours: number[]): string[] {
    return hours.map(hour => {
        const period = hour < 12 ? 'AM' : 'PM';
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        return `${displayHour}${period}`;
    });
}

export function escapeHtml(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}