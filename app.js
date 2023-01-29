const http = require('http');
const url = require('url');
const puppeteer = require('puppeteer');

const hostname = 'localhost';
const port = process.env.PORT || 3000;
const baseDir = __dirname + "/";
const debug = true;

function logDebugMessage(message) {
  if (debug) {
    console.log(message);
  }
}

/**
 * Main Program - Start Server
 */
const server = http.createServer(async (req, res) => {
  if (req.url === '/favicon.ico') {
    res.writeHead(200);
    res.end('');
  }

  if (req.url === '/') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=UTF-8');
    let htmlText = 'Hello World';
    res.end(htmlText);
  }

  if (req.url.includes('stb')) {
    const queryObject = url.parse(req.url,true).query;
    logDebugMessage(JSON.stringify(queryObject, null, 2));

    let browser = null;
    try {
      if (process.env.NODE_ENV === 'prod') {
        browser = await puppeteer.launch({ headless: true });
      } else {
        browser = await puppeteer.launch({ headless: false, executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
      }
      const page = await browser.newPage();
  
      await page.goto('http://www.example.com/', {waitUntil: 'networkidle2'});
      const screenshot = await page.screenshot();
  
      res.end(screenshot, 'binary');
    } catch (error) {
      if (!res.headersSent) {
        res.statusCode = 400;
        res.end(error.message);
      }
    } finally {
      if (browser) {
        browser.close();
      }
    }
  }
});
    
server.listen(port, hostname, () => {
  const env = (process.env.NODE_ENV === 'prod') ? 'PROD' : 'DEV'
  console.log(`Server running on ${env} at http://${hostname}:${port}/`);
});
