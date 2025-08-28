const fs = require('fs').promises;
const path = require('path');

async function repairLogFile() {
    const logFilePath = path.join(__dirname, 'data/api_logs.json');
    
    try {
        console.log('Starting log file repair...');
        console.log('Log file path:', logFilePath);
        
        // Check if file exists
        try {
            await fs.access(logFilePath);
        } catch (error) {
            console.log('Log file does not exist, creating new one...');
            await fs.writeFile(logFilePath, JSON.stringify([], null, 2));
            console.log('New log file created successfully');
            return;
        }
        
        // Read the file
        const data = await fs.readFile(logFilePath, 'utf8');
        console.log('File size:', data.length, 'characters');
        
        if (!data.trim()) {
            console.log('File is empty, initializing with empty array...');
            await fs.writeFile(logFilePath, JSON.stringify([], null, 2));
            return;
        }
        
        // Try to parse JSON
        try {
            const logs = JSON.parse(data);
            if (Array.isArray(logs)) {
                console.log('File is valid JSON with', logs.length, 'entries');
                
                // Clean up if too many entries
                if (logs.length > 5000) {
                    const removedCount = logs.length - 5000;
                    logs.splice(0, removedCount);
                    console.log(`Removed ${removedCount} old entries`);
                    
                    await fs.writeFile(logFilePath, JSON.stringify(logs, null, 2));
                    console.log('File cleaned and saved successfully');
                } else {
                    console.log('File is clean and within size limits');
                }
                return;
            } else {
                console.log('File contains valid JSON but not an array');
            }
        } catch (parseError) {
            console.log('JSON parse error:', parseError.message);
        }
        
        // Try to find last valid JSON array
        console.log('Attempting to repair corrupted JSON...');
        
        let lastValidPosition = 0;
        let bracketCount = 0;
        let inString = false;
        let escapeNext = false;
        
        for (let i = 0; i < data.length; i++) {
            const char = data[i];
            
            if (escapeNext) {
                escapeNext = false;
                continue;
            }
            
            if (char === '\\') {
                escapeNext = true;
                continue;
            }
            
            if (char === '"' && !escapeNext) {
                inString = !inString;
                continue;
            }
            
            if (!inString) {
                if (char === '[') {
                    bracketCount++;
                } else if (char === ']') {
                    bracketCount--;
                    if (bracketCount === 0) {
                        lastValidPosition = i;
                    }
                }
            }
        }
        
        if (lastValidPosition > 0) {
            console.log('Found valid JSON ending at position:', lastValidPosition);
            
            // Create backup
            const backupPath = logFilePath + '.backup.' + Date.now();
            await fs.writeFile(backupPath, data);
            console.log('Corrupted file backed up to:', backupPath);
            
            // Extract valid JSON part
            const validJson = data.substring(0, lastValidPosition + 1);
            try {
                const logs = JSON.parse(validJson);
                if (Array.isArray(logs)) {
                    // Clean up if too many entries
                    if (logs.length > 5000) {
                        const removedCount = logs.length - 5000;
                        logs.splice(0, removedCount);
                        console.log(`Removed ${removedCount} old entries during repair`);
                    }
                    
                    // Write repaired file
                    await fs.writeFile(logFilePath, JSON.stringify(logs, null, 2));
                    console.log('Log file repaired successfully with', logs.length, 'entries');
                    return;
                }
            } catch (parseError) {
                console.log('Failed to parse even the truncated JSON:', parseError.message);
            }
        }
        
        // If we can't repair, reset the file
        console.log('Cannot repair log file, resetting to empty array...');
        
        // Create backup of corrupted file
        const backupPath = logFilePath + '.corrupted.' + Date.now();
        await fs.writeFile(backupPath, data);
        console.log('Corrupted file backed up to:', backupPath);
        
        // Reset file
        await fs.writeFile(logFilePath, JSON.stringify([], null, 2));
        console.log('Log file reset to empty array');
        
    } catch (error) {
        console.error('Error during repair:', error);
        
        // Try to reset the file as last resort
        try {
            await fs.writeFile(logFilePath, JSON.stringify([], null, 2));
            console.log('Log file reset to empty array as last resort');
        } catch (resetError) {
            console.error('Failed to reset log file:', resetError);
        }
    }
}

// Run the repair function
repairLogFile().then(() => {
    console.log('Log file repair completed');
    process.exit(0);
}).catch(error => {
    console.error('Log file repair failed:', error);
    process.exit(1);
});
