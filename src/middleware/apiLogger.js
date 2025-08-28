const fs = require('fs').promises;
const path = require('path');

class ApiLogger {
    constructor() {
        this.logFilePath = path.join(__dirname, '../../data/api_logs.json');
        this.ensureLogFile();
    }

    async ensureLogFile() {
        try {
            await fs.access(this.logFilePath);
            
            // Check if file is corrupted and try to repair
            try {
                const data = await fs.readFile(this.logFilePath, 'utf8');
                if (data.trim()) {
                    JSON.parse(data);
                }
            } catch (parseError) {
                console.warn('Log file appears to be corrupted, attempting repair...');
                await this.repairLogFile();
            }
            
            // Clean up old logs periodically
            await this.cleanupOldLogs();
            
        } catch (error) {
            // Create directory if it doesn't exist
            const dir = path.dirname(this.logFilePath);
            try {
                await fs.mkdir(dir, { recursive: true });
            } catch (mkdirError) {
                console.error('Error creating directory:', mkdirError);
            }
            
            // Create empty log file
            await fs.writeFile(this.logFilePath, JSON.stringify([], null, 2));
        }
    }

    sanitizeBody(body) {
        if (!body || typeof body !== 'object') {
            return body || {};
        }

        // Create a copy to avoid modifying original
        const sanitized = { ...body };

        // Mask sensitive fields
        if (sanitized.password) {
            sanitized.password = '***MASKED***';
        }
        if (sanitized.token) {
            sanitized.token = '***MASKED***';
        }
        if (sanitized.apiKey) {
            sanitized.apiKey = '***MASKED***';
        }

        return sanitized;
    }

    processHeaders(req, body) {
        // ถ้าเป็น login request
        if (req.originalUrl === '/api/auth/login') {
            // ถ้ามี body data
            if (body && body.username && body.password) {
                return {
                    employeeID: req.get('employeeID') || '',
                    fullName: `username: ${body.username} password: ***MASKED***`,
                    fullNameThai: req.get('fullNameThai') || '',
                    department: req.get('department') || '',
                    position: req.get('position') || '',
                    clientIP: req.get('clientIP'),
                    deviceName: req.get('deviceName'),
                    operatingSystem: req.get('operatingSystem'),
                    websiteResolution: req.get('websiteResolution'),
                    displayResolution: req.get('displayResolution')
                };
            }
            // ถ้าไม่มี body data (log เก่า) ให้ใส่ placeholder
            return {
                employeeID: req.get('employeeID') || '',
                fullName: 'login_attempt',
                fullNameThai: req.get('fullNameThai') || '',
                department: req.get('department') || '',
                position: req.get('position') || '',
                clientIP: req.get('clientIP'),
                deviceName: req.get('deviceName'),
                operatingSystem: req.get('operatingSystem'),
                websiteResolution: req.get('websiteResolution'),
                displayResolution: req.get('displayResolution')
            };
        }

        // สำหรับ request อื่นๆ ใช้แบบเดิม
        return {
            employeeID: req.get('employeeID'),
            fullName: req.get('fullName'),
            fullNameThai: req.get('fullNameThai'),
            department: req.get('department'),
            position: req.get('position'),
            clientIP: req.get('clientIP'),
            deviceName: req.get('deviceName'),
            operatingSystem: req.get('operatingSystem'),
            websiteResolution: req.get('websiteResolution'),
            displayResolution: req.get('displayResolution')
        };
    }

    async logApiCall(req, res, next) {
        // Skip logging for API logs endpoints to prevent recursive logging
        if (req.originalUrl.startsWith('/api/logs') || req.originalUrl.startsWith('/logs')) {
            return next();
        }
        
        const startTime = Date.now();
        const apiLogger = this; // Store reference to this
        
        // Capture original send method
        const originalSend = res.send;
        
        // Override send method to capture response
        res.send = function(data) {
            const endTime = Date.now();
            const responseTime = endTime - startTime;
            
            // Create log entry
            const logEntry = {
                timestamp: new Date().toISOString(),
                requestTime: new Date(startTime).toISOString(),
                responseTime: new Date(endTime).toISOString(),
                duration: responseTime,
                method: req.method,
                url: req.originalUrl,
                statusCode: res.statusCode,
                userAgent: req.get('User-Agent'),
                ip: req.ip || req.connection.remoteAddress,
                headers: apiLogger.processHeaders(req, req.body),
                query: req.query,
                body: apiLogger.sanitizeBody(req.body),
                responseSize: data ? JSON.stringify(data).length : 0
            };

            // Save log entry asynchronously
            apiLogger.saveLogEntry(logEntry);
            
            // Call original send method
            return originalSend.call(this, data);
        };

        next();
    }

    async saveLogEntry(logEntry) {
        try {
            // Read existing logs with error handling
            let logs = [];
            try {
                const data = await fs.readFile(this.logFilePath, 'utf8');
                if (data.trim()) {
                    logs = JSON.parse(data);
                }
            } catch (readError) {
                console.error('Error reading log file, creating new one:', readError);
                // If file is corrupted, create new one
                logs = [];
            }
            
            // Validate logs array
            if (!Array.isArray(logs)) {
                console.warn('Logs file is corrupted, resetting to empty array');
                logs = [];
            }
            
            // Add new log entry
            logs.push(logEntry);
            
            // Keep only last 5000 entries to prevent file from growing too large
            if (logs.length > 5000) {
                logs.splice(0, logs.length - 5000);
            }
            
            // Write back to file with error handling
            try {
                await fs.writeFile(this.logFilePath, JSON.stringify(logs, null, 2));
            } catch (writeError) {
                console.error('Error writing to log file:', writeError);
                // Try to write to backup file
                const backupPath = this.logFilePath + '.backup';
                try {
                    await fs.writeFile(backupPath, JSON.stringify(logs, null, 2));
                    console.log('Logs saved to backup file:', backupPath);
                } catch (backupError) {
                    console.error('Failed to write to backup file:', backupError);
                }
            }
        } catch (error) {
            console.error('Error saving API log:', error);
        }
    }

    async getLogs(limit = 100, offset = 0) {
        try {
            const data = await fs.readFile(this.logFilePath, 'utf8');
            if (!data.trim()) {
                return [];
            }
            
            let logs;
            try {
                logs = JSON.parse(data);
            } catch (parseError) {
                console.error('Error parsing log file:', parseError);
                return [];
            }
            
            // Validate logs array
            if (!Array.isArray(logs)) {
                console.warn('Logs file is corrupted, returning empty array');
                return [];
            }
            
            // Return logs with pagination
            return logs.slice(offset, offset + limit);
        } catch (error) {
            console.error('Error reading API logs:', error);
            return [];
        }
    }

    async getLogsByDate(startDate, endDate) {
        try {
            const data = await fs.readFile(this.logFilePath, 'utf8');
            if (!data.trim()) {
                return [];
            }
            
            let logs;
            try {
                logs = JSON.parse(data);
            } catch (parseError) {
                console.error('Error parsing log file:', parseError);
                return [];
            }
            
            // Validate logs array
            if (!Array.isArray(logs)) {
                console.warn('Logs file is corrupted, returning empty array');
                return [];
            }
            
            const start = new Date(startDate);
            const end = new Date(endDate);
            
            return logs.filter(log => {
                const logDate = new Date(log.timestamp);
                return logDate >= start && logDate <= end;
            });
        } catch (error) {
            console.error('Error reading API logs by date:', error);
            return [];
        }
    }

    async getLogsByEmployee(employeeID) {
        try {
            const data = await fs.readFile(this.logFilePath, 'utf8');
            if (!data.trim()) {
                return [];
            }
            
            let logs;
            try {
                logs = JSON.parse(data);
            } catch (parseError) {
                console.error('Error parsing log file:', parseError);
                return [];
            }
            
            // Validate logs array
            if (!Array.isArray(logs)) {
                console.warn('Logs file is corrupted, returning empty array');
                return [];
            }
            
            return logs.filter(log => 
                log.headers.employeeID === employeeID
            );
        } catch (error) {
            console.error('Error reading API logs by employee:', error);
            return [];
        }
    }

    async getStatistics() {
        try {
            const data = await fs.readFile(this.logFilePath, 'utf8');
            if (!data.trim()) {
                return {
                    totalCalls: 0,
                    averageResponseTime: 0,
                    callsByMethod: {},
                    callsByStatus: {},
                    callsByEmployee: {},
                    callsByDepartment: {}
                };
            }
            
            let logs;
            try {
                logs = JSON.parse(data);
            } catch (parseError) {
                console.error('Error parsing log file:', parseError);
                return {
                    totalCalls: 0,
                    averageResponseTime: 0,
                    callsByMethod: {},
                    callsByStatus: {},
                    callsByEmployee: {},
                    callsByDepartment: {}
                };
            }
            
            // Validate logs array
            if (!Array.isArray(logs)) {
                console.warn('Logs file is corrupted, returning empty stats');
                return {
                    totalCalls: 0,
                    averageResponseTime: 0,
                    callsByMethod: {},
                    callsByStatus: {},
                    callsByEmployee: {},
                    callsByDepartment: {}
                };
            }
            
            const stats = {
                totalCalls: logs.length,
                averageResponseTime: 0,
                callsByMethod: {},
                callsByStatus: {},
                callsByEmployee: {},
                callsByDepartment: {}
            };
            
            if (logs.length > 0) {
                const totalResponseTime = logs.reduce((sum, log) => sum + log.duration, 0);
                stats.averageResponseTime = totalResponseTime / logs.length;
                
                // Group by method
                logs.forEach(log => {
                    stats.callsByMethod[log.method] = (stats.callsByMethod[log.method] || 0) + 1;
                    stats.callsByStatus[log.statusCode] = (stats.callsByStatus[log.statusCode] || 0) + 1;
                    
                    if (log.headers.employeeID) {
                        stats.callsByEmployee[log.headers.employeeID] = (stats.callsByEmployee[log.headers.employeeID] || 0) + 1;
                    }
                    
                    if (log.headers.department) {
                        stats.callsByDepartment[log.headers.department] = (stats.callsByDepartment[log.headers.department] || 0) + 1;
                    }
                });
            }
            
            return stats;
        } catch (error) {
            console.error('Error getting API statistics:', error);
            return {
                totalCalls: 0,
                averageResponseTime: 0,
                callsByMethod: {},
                callsByStatus: {},
                callsByEmployee: {},
                callsByDepartment: {}
            };
        }
    }

    async repairLogFile() {
        try {
            console.log('Attempting to repair corrupted log file...');
            
            // Try to read the file and find where it's corrupted
            const data = await fs.readFile(this.logFilePath, 'utf8');
            
            // Find the last valid JSON array
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
                // Extract valid JSON part
                const validJson = data.substring(0, lastValidPosition + 1);
                try {
                    const logs = JSON.parse(validJson);
                    if (Array.isArray(logs)) {
                        // Create backup of corrupted file
                        const backupPath = this.logFilePath + '.corrupted.' + Date.now();
                        await fs.writeFile(backupPath, data);
                        console.log('Corrupted file backed up to:', backupPath);
                        
                        // Write repaired file
                        await fs.writeFile(this.logFilePath, JSON.stringify(logs, null, 2));
                        console.log('Log file repaired successfully');
                        return true;
                    }
                } catch (parseError) {
                    console.error('Failed to parse even the truncated JSON:', parseError);
                }
            }
            
            // If we can't repair, reset the file
            console.log('Cannot repair log file, resetting to empty array');
            await fs.writeFile(this.logFilePath, JSON.stringify([], null, 2));
            return true;
            
        } catch (error) {
            console.error('Error repairing log file:', error);
            // Try to reset the file
            try {
                await fs.writeFile(this.logFilePath, JSON.stringify([], null, 2));
                console.log('Log file reset to empty array');
                return true;
            } catch (resetError) {
                console.error('Failed to reset log file:', resetError);
                return false;
            }
        }
    }

    async cleanupOldLogs() {
        try {
            console.log('Cleaning up old log entries...');
            
            const data = await fs.readFile(this.logFilePath, 'utf8');
            if (!data.trim()) {
                return;
            }
            
            let logs;
            try {
                logs = JSON.parse(data);
            } catch (parseError) {
                console.error('Error parsing log file during cleanup:', parseError);
                return;
            }
            
            if (!Array.isArray(logs)) {
                console.warn('Logs file is corrupted during cleanup');
                return;
            }
            
            // Keep only last 5000 entries (reduced from 10000)
            if (logs.length > 5000) {
                const removedCount = logs.length - 5000;
                logs.splice(0, removedCount);
                console.log(`Removed ${removedCount} old log entries`);
                
                // Write cleaned logs back to file
                await fs.writeFile(this.logFilePath, JSON.stringify(logs, null, 2));
                console.log('Log file cleaned successfully');
            }
            
        } catch (error) {
            console.error('Error during log cleanup:', error);
        }
    }
}

const apiLogger = new ApiLogger();

module.exports = apiLogger; 
