const http = require('http');
const url = require('url');
const puppeteer = require('puppeteer');

const hostname = process.env.RENDER_EXTERNAL_HOSTNAME || null;//'localhost'
const port = process.env.PORT || 3000;
const baseDir = __dirname + "/";
const debug = true;

const normalText = 'Hello World';
const idelTime = 500;

function logDebugMessage(message) {
  if ((process.env.NODE_ENV !== 'prod') && (debug)) {
    console.log(message);
  }
}

function runPromise(promise) {
  return promise.then(data => {
     return [null, data];
  })
  .catch(err => [err]);
}

async function processMergeCard(page, item, makeDefault, objResult) {
  // Init Card Info
  let card = {
    orderID: item.orderID,
    cardNumber: item.cardNumber,
    cardCode: item.cardCode,
    balance: item.balance,
    cardBalanceBefore: '',
    cardBalanceAfter: ''
  }
  logDebugMessage(`==== Process Card: ${card.cardNumber} `);

  try {
    let error, result;

    // Click 'Add a Card'
    await page.$eval('#card_add', el => el.click());
    await page.waitForNetworkIdle({idleTime: idelTime});

    // Fill Info
    // Card Nick Name
    await page.type('#CardNickName', card.orderID);
    // Card Number
    await page.type('#CardNumber', card.cardNumber);
    // Card Security Code (CSC)
    await page.type('#CardCSC', card.cardCode);

    // Click btn Add Card
    await page.$eval('button[type=submit]', el => el.click());
    await page.waitForNetworkIdle({idleTime: idelTime});

    [error, result] = await runPromise(page.$eval('#card-properties > span.balance.numbers', el => el.innerHTML));
    if (error) {
      // Card Error
      logDebugMessage(`**** Error Before Transfer Funds ****`);
      objResult.listFail.push(card);
      return false;
    }

    // Get Balance of this card: Before Transfer
    let txtBalance = result;
    let str = txtBalance.split(' ');
    card.cardBalanceBefore = str[0];
    logDebugMessage(`cardBalanceBefore: ${card.cardBalanceBefore}`);

    // No Value in Card
    if (parseInt(card.cardBalanceBefore) === 0) {
      logDebugMessage(`**** Duplicated or No Value ****`);
      card.cardBalanceAfter = 'NO_VAL';
      objResult.listFail.push(card);

      // Click Remove Card
      await page.$eval('#btn06', el => el.click());
      await page.waitForNetworkIdle({idleTime: idelTime});

      // Click Submit
      await page.$eval('#Button1', el => el.click());
      await page.waitForNetworkIdle({idleTime: idelTime});

      return false;
    }

    // Only First Time, Set it as default
    if (makeDefault) {
      // Click Set Default Card
      await page.$eval('#btn08', el => el.click());
      await page.waitForNetworkIdle({idleTime: idelTime});

      logDebugMessage(`** Default Card **`);
      card.cardBalanceAfter = 'DEFAULT';
      objResult.amountTotal = objResult.amountTotal + parseInt(card.cardBalanceBefore);
      objResult.listSuccess.push(card);
      objResult.listMergedCard.push(card);
      return true;
    }

    // Click Transfer Funds
    await page.$eval('#btn03', el => el.click());
    await page.waitForNetworkIdle({idleTime: idelTime});

    // Click Submit
    await page.$eval('#reload_submit', el => el.click());
    await page.waitForNetworkIdle({idleTime: idelTime});

    [error, result] = await runPromise(page.$eval('#card-properties > span.balance.numbers', el => el.innerHTML));
    if (error) {
      // Card Error
      logDebugMessage(`**** Error After Transfer Funds ****`);
      objResult.listFail.push(card);
      return false;
    }

    // Get Balance of this card: After Transfer
    txtBalance = result;
    str = txtBalance.split(' ');
    card.cardBalanceAfter = str[0];
    logDebugMessage(`cardBalanceAfter: ${card.cardBalanceAfter}`);
  
    // Write Output
    objResult.amountTotal = objResult.amountTotal + parseInt(card.cardBalanceBefore);
    objResult.listSuccess.push(card);

    // Transfer Success
    if (card.cardBalanceBefore !== card.cardBalanceAfter) {

      // Click Remove Card
      await page.$eval('#btn06', el => el.click());
      await page.waitForNetworkIdle({idleTime: idelTime});

      // Click Submit
      await page.$eval('#Button1', el => el.click());
      await page.waitForNetworkIdle({idleTime: idelTime});

      return true;
    }

    // Transfer Failed, then set it as default
    // Click Set Default Card
    await page.$eval('#btn08', el => el.click());
    await page.waitForNetworkIdle({idleTime: idelTime});

    logDebugMessage(`** Default Card **`);
    objResult.listMergedCard.push(card);
  } catch (error) {
    // Do something before throw error
    console.log(`**** Error on processMergeCard ${card.cardNumber} ****`);

    // Take Error Screen Shot 
    /*
    objResult.errScreenShot = await page.screenshot({ fullPage: true, encoding: "base64" })
    .then((data) => {
      let base64Encode = `data:image/png;base64,${data}`;
      return base64Encode;
    });
    */

    throw error;
  }

  return true;
}

async function doLogin(browser, url, email, password) {
  try {
    let page = await browser.newPage();
    await page.goto(url, {waitUntil: 'networkidle2'});
  
    // Login by Fill User / Password
    await page.type('#Email', email);
    await page.type('#Password', password);
    await page.$eval('button[type=submit]', el => el.click());
    await page.waitForNetworkIdle({idleTime: idelTime});
  
    return page;
  } catch (error) {
    throw error
  }
}

/**
 * Main Program - Start Server
 */
const server = http.createServer(async (req, res) => {
  const { headers, method } = req;

  // GET
  if (method === 'GET') {
    if (req.url === '/favicon.ico') {
      res.writeHead(200);
      res.end('');
      return;
    }

    if (req.url === '/') {
      //res.statusCode = 200;
      //res.setHeader('Content-Type', 'text/html; charset=UTF-8');
      //res.end(normalText);
      //return;

console.log('browser launch');
 browser = await puppeteer.launch({
            headless: true,
            ignoreHTTPSErrors: true,
            slowMo: 0,
            args: [
              '--disable-gpu',
              '--disable-dev-shm-usage',
              '--disable-setuid-sandbox',
              '--no-first-run',
              '--no-sandbox',
              '--no-zygote',
              '--window-size=1280,720',
            ]
          });

const page = await browser.newPage();
console.log('browser launch done');
        await page.setViewport({ width: 1280, height: 720 });

        // Block images, videos, fonts from downloading
        await page.setRequestInterception(true);
        page.on('request', (interceptedRequest) => {
          const blockResources = ['script', 'stylesheet', 'image', 'media', 'font'];
          if (blockResources.includes(interceptedRequest.resourceType())) {
            interceptedRequest.abort();
          } else {
            interceptedRequest.continue();
          }
        });
        await page.goto('https://www.google.com', {waitUntil: 'networkidle2'});

        // Login by Fill User / Password
        //await page.type('#Email', email);
        //await page.type('#Password', password);
        //await page.$eval('button[type=submit]', el => el.click());
        await page.waitForNetworkIdle({idleTime: idelTime});

        const screenshot = await page.screenshot();
    console.log('screenshot done');
        res.end(screenshot, 'binary');
      
    }

    if (req.url.includes('stb')) {
      const queryObject = url.parse(req.url, true).query;
      logDebugMessage(JSON.stringify(queryObject, null, 2));

      const email = decodeURI(queryObject['email']);
      const password = decodeURI(queryObject['password']);
      logDebugMessage(`email: ${email}, password: ${password}`);

      // No Email and Password
      if (!(email && password)) {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/html; charset=UTF-8');
        res.end(normalText);
        return;
      }
  
      let browser = null;
      try {
        if (process.env.NODE_ENV === 'prod') {
          browser = await puppeteer.launch({
            headless: true,
            ignoreHTTPSErrors: true,
            slowMo: 0,
            args: [
              '--disable-gpu',
              '--disable-dev-shm-usage',
              '--disable-setuid-sandbox',
              '--no-first-run',
              '--no-sandbox',
              '--no-zygote',
              '--window-size=1280,720',
            ]
          });
        } else {
          browser = await puppeteer.launch({
            headless: false,
            ignoreHTTPSErrors: true,
            slowMo: 0,
            args: [
              '--disable-gpu',
              '--disable-dev-shm-usage',
              '--disable-setuid-sandbox',
              '--no-first-run',
              '--no-sandbox',
              '--no-zygote',
              '--window-size=1280,720',
            ],
            executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
          });
        }
        const page = await browser.newPage();

        await page.setViewport({ width: 1280, height: 720 });

        // Block images, videos, fonts from downloading
        await page.setRequestInterception(true);
        page.on('request', (interceptedRequest) => {
          const blockResources = ['script', 'stylesheet', 'image', 'media', 'font'];
          if (blockResources.includes(interceptedRequest.resourceType())) {
            interceptedRequest.abort();
          } else {
            interceptedRequest.continue();
          }
        });
        await page.goto('https://www.google.com', {waitUntil: 'networkidle2'});

        // Login by Fill User / Password
        //await page.type('#Email', email);
        //await page.type('#Password', password);
        //await page.$eval('button[type=submit]', el => el.click());
        await page.waitForNetworkIdle({idleTime: idelTime});

        const screenshot = await page.screenshot();
    
        res.end(screenshot, 'binary');
      } catch (error) {
        res.statusCode = 400;
        res.end(error.message);
      } finally {
        if (browser) {
          browser.close();
        }
      }

      return;
    }
  }

  // POST
  if (method === 'POST') {
    if (req.url === '/testPost') {
      let body = [];
      req.on('data', (chunk) => {
        body.push(chunk);
      }).on('end', async () => {
        body = Buffer.concat(body).toString();
        const payload = JSON.parse(body);
        // logDebugMessage(payload)

        let startTime = new Date();
        const email = payload['email'];
        const password = payload['password'];
        const command = payload['command']; // Merge or Split
        const dataItems = payload['dataItems'];
        
        // logDebugMessage(`email: ${email}, password: ${password}`);

        // No Email and Password
        if (!(email && password)) {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'text/html; charset=UTF-8');
          res.end(normalText);
          return;
        }

        // TODO: Get dataItem from another source
        // Validate dataItems
        let inputJSON = false
        if (dataItems && Array.isArray(dataItems)) {
          // Empty item
          if (dataItems.length === 0) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'text/html; charset=UTF-8');
            res.end(normalText);
            return;
          }

          let item = dataItems[0];
          if (typeof item === 'object' && item !== null) {
            inputJSON = true
          }
        } else {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'text/html; charset=UTF-8');
          res.end(normalText);
          return;
        }

        console.log(`Start Processing ${dataItems.length} items`);
        res.statusCode = 200;
        res.end('Ready to process and will notify when done');

        // Set delay as appropriate
        const delayMs = 2000;
        return setTimeout(async () => {
          console.log("Timeout complete, starting job...");
          // Kick off a new job by adding it to the work queue; Response is send in the consumer.js of this job
          let objResult = {
            status: '',
            errMessage: '',
            errScreenShot: '',
            amountTotal: 0,
            listMergedCard: [],
            listSuccess: [],
            listFail: []
          }
          let browser = null;
          try {
            if (process.env.NODE_ENV === 'prod') {
              browser = await puppeteer.launch({
                headless: true,
                ignoreHTTPSErrors: true,
                slowMo: 0,
                args: [
                  '--disable-gpu',
                  '--disable-dev-shm-usage',
                  '--disable-setuid-sandbox',
                  '--no-first-run',
                  '--no-sandbox',
                  '--no-zygote'
                ]
              });
            } else {
              browser = await puppeteer.launch({
                headless: false,
                ignoreHTTPSErrors: true,
                slowMo: 0,
                args: [
                  '--disable-gpu',
                  '--disable-dev-shm-usage',
                  '--disable-setuid-sandbox',
                  '--no-first-run',
                  '--no-sandbox',
                  '--no-zygote'
                ],
                executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
              });
            }
            const stbUrl = 'https://www.starbuckscardth.in.th/Authorize';
            let page = await doLogin(browser, stbUrl, email, password);
  
            // Click 'Card'
            await page.$eval('input[type=submit]', el => el.click());
            await page.waitForNetworkIdle({idleTime: idelTime});
  
            // Loop for Add Card
            let makeDefault = true; // Flag for Make Default on first item
            let processResult = false;
            for(let i = 0; i < dataItems.length; i++) {
              // Show Progress
              if (((i === 0) || (i === (dataItems.length - 1))) || (((i + 1) % 5) === 0)) {
                console.log(`Processed item: ${i + 1}`);
              }
  
              let error, result, item;
              do {
                if (inputJSON) {
                  item = dataItems[i];
                } else {
                  // Convert each CSV to JSON
                  const line = dataItems[i];
                  if (line === '') {
                    continue;
                  }
                  const data = line.split(',');
                  item = {
                    orderID: i.toString().padStart(3, '0'),
                    cardNumber: data[0],
                    cardCode: data[1],
                    balance: data[2]
                  }
                }
                error = null;
                [error, result] = await runPromise(processMergeCard(page, item, makeDefault, objResult));
                if (error) {
                  let retAdd, errAdd = null;
                  let ret1, err1 = null;
                  do {
                    console.log(`Try Re-Add Card`);
                    // Click 'Card'
                    [errAdd, retAdd] = await runPromise(page.$eval('input[type=submit]', el => el.click()));
                    [err1, ret1] = await page.waitForNetworkIdle({idleTime: idelTime});
                    if (errAdd) {
                      let errLogin = null;
                      console.log(`Try Re-Login`);
                      [errLogin, page] = await doLogin(browser, stbUrl, email, password);
                      if (errLogin) {
                        console.log(`Re-Login Error`);
                        throw errLogin;
                      }
                    }
                  } while (errAdd);
                }
                processResult = result;
              } while (error);
  
              if (processResult && makeDefault) {
                makeDefault = false;
              }
            }
  
            // Set Success
            objResult.status = 'Success';
          } catch (error) {
            console.log(error.message);
  
            // Set Fail and error message
            objResult.status = 'Fail';
            objResult.errMessage = error.message;
          }

          if (browser) {
            browser.close();
          }

          // Process Time
          console.log(`*** Finished ***`);
          let endTime = new Date();
          console.log(`Start At: ${startTime}`)
          console.log(`End At: ${endTime}`)
          const diffMinute = Math.ceil(Math.abs(endTime - startTime) / (1000 * 60)); 
          console.log(`Elapsed: ${diffMinute} minute`)

          // Show Result
          console.log(`Process amount: ${objResult.amountTotal}`);
          if (objResult.listMergedCard.length > 0) {
            console.log(`*** Merged Card ***`);
            objResult.listMergedCard.map((card) => {
              console.log(Object.values(card).toString());
            })
          }
          if (objResult.listFail.length > 0) {
            console.log(`*** Failed card ***`);
            objResult.listFail.map((card) => {
              console.log(Object.values(card).toString());
            })
          }

          // TODO: Notify

        }, delayMs);
      });

      return;
    }
  }

  // Default
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=UTF-8');
  res.end(normalText);
  return;
});
    
server.listen(port, hostname, () => {
  const env = (process.env.NODE_ENV === 'prod') ? 'PROD' : 'DEV'
  console.log(`Server running on ${env} at http://${hostname}:${port}/`);
});
