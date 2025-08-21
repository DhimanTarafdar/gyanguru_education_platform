// Request logging middleware

const logger = (req, res, next) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.originalUrl;
  const ip = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent') || '';

  // Log request
  console.log(`${timestamp} - ${method} ${url} - IP: ${ip}`.cyan);
  
  // Log request body for POST/PUT requests (excluding sensitive data)
  if ((method === 'POST' || method === 'PUT') && req.body) {
    const logBody = { ...req.body };
    
    // Remove sensitive fields
    delete logBody.password;
    delete logBody.token;
    delete logBody.refreshToken;
    
    if (Object.keys(logBody).length > 0) {
      console.log(`Request Body:`, logBody);
    }
  }

  // Track response time
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    
    let statusColor;
    if (status >= 500) {
      statusColor = 'red';
    } else if (status >= 400) {
      statusColor = 'yellow';
    } else if (status >= 300) {
      statusColor = 'cyan';
    } else {
      statusColor = 'green';
    }
    
    console.log(`${timestamp} - ${method} ${url} - ${status} - ${duration}ms`[statusColor]);
  });

  next();
};

module.exports = logger;
