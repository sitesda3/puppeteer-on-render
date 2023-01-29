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
  if (req.url == '/favicon.ico') {
    res.writeHead(200);
    res.end('');
  }

  if (req.url == '/') {
    logDebugMessage(req.url);
    const queryObject = url.parse(req.url,true).query;
    let searchName = '';
    if (queryObject.songName) {
      searchName = queryObject.songName;
    }
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=UTF-8');
    let htmlText = 'Hello World';
    res.end(htmlText);
  }

  if (req.url == '/test') {
    let browser = null;

    try {
      browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();
  
      await page.goto('http://www.example.com/', {waitUntil: 'networkidle2'});
      const screenshot = await page.screenshot();
  
      res.end(screenshot, 'binary');
    } catch (error) {
      if (!res.headersSent) {
        res.status(400).send(error.message);
      }
    } finally {
      if (browser) {
        browser.close();
      }
    }
  }
});
    
server.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});
