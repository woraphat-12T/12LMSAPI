require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { testConnection } = require('./config/sequelize');
const { setupLogger } = require('./utils/logger');
const morganStream = require('./utils/morganStream');
const apiLogger = require('./middleware/apiLogger');
const authRoutes = require('./routes/auth');
const inventoryRoutes = require('./routes/inventory');
const transportRoutes = require('./routes/transport');
const reportTmsRoutes = require('./routes/reportTms');

const nobillRoutes = require('./routes/oms/report/notBill');
const shipmentCostRoutes = require('./routes/oms/report/shipmentCost');
const planningAllRoutes = require('./routes/oms/report/planningAll');
const creditLimitRoutes = require('./routes/oms/report/creditLimit');
const backlogRoutes = require('./routes/oms/manage/backlog');
 
const userRoutes = require('./routes/user');
const apiLogsRoutes = require('./routes/apiLogs');
const warehouseRoutes = require('./routes/warehouse');

const importProductPlanRoutes = require('./routes/pdm/importProductPlan');
const specialPlanRoutes = require('./routes/pdm/specialPlan');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

// Setup logger with Socket.IO
const logger = setupLogger(io);

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            "script-src": ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net"],
            "style-src": ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net"],
            "img-src": ["'self'", "data:", "cdn.jsdelivr.net"],
            "connect-src": ["'self'", "ws:", "wss:"]
        }
    }
}));
app.use(cors());
app.use(express.json());
app.use(compression());

// API Logger middleware - must be before routes
app.use(apiLogger.logApiCall.bind(apiLogger));

// Morgan logging middleware with custom format
morgan.token('body', (req) => JSON.stringify(req.body));
morgan.token('query', (req) => JSON.stringify(req.query));
morgan.token('user', (req) => req.user?.username || req.user?.employeeID || 'anonymous');

const morganFormat = ':remote-addr - :user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time ms :query :body';

app.use(morgan(morganFormat, {
    stream: morganStream,
    skip: (req) => req.path === '/health' // Skip logging for health check endpoints
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/transport', transportRoutes);
app.use('/api/report-tms', reportTmsRoutes);
// app.use('/api/report-oms', reportOmsRoutes);
app.use('/api/report/oms/nobill', nobillRoutes);
app.use('/api/report/oms/shipment-cost', shipmentCostRoutes);
app.use('/api/report/oms/credit-limit', creditLimitRoutes);
app.use('/api/warehouse', warehouseRoutes);
app.use('/api/report/oms/planning-all', planningAllRoutes);
app.use('/api/oms/manage/backlog', backlogRoutes);

app.use('/api/import-product-plan', importProductPlanRoutes);
app.use('/api/special-plan', specialPlanRoutes);

app.use('/api/user', userRoutes);
app.use('/api/logs', apiLogsRoutes);


// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    logger.error(err.stack);
    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id}`);
    
    socket.on('disconnect', () => {
        logger.info(`Client disconnected: ${socket.id}`);
    });
});

// Database connection and server start
const PORT = process.env.PORT || 8008;

async function startServer() {
    try {
        await testConnection();
        httpServer.listen(PORT, () => {
            logger.info(`Server is running on port ${PORT}`);
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

require('../cronjob/main')

startServer(); 
