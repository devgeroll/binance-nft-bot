const LOGIN_NETWORK_CALLBACK = "https://www.binance.com/bapi/accounts/v1/public/authcenter/callback";
const PRODUCT_NETWORK_CALLBACK = "https://www.binance.com/bapi/nft/v1/friendly/nft/mystery-box/detail?productId=";
const AUCTION_NETWORK_CALLBACK = "https://www.binance.com/bapi/nft/v1/private/nft/nft-trade/product-onsale";
const PURCHASE_NETWORK_CALLBACK = "https://www.binance.com/bapi/nft/v1/private/nft/mystery-box/purchase";

const DEV_CALLBACK = "https://www.binance.com/bapi/accounts/v1/public/authcenter/auth";

const URL_GET_PRODUCT_DETAILS = "https://www.binance.com/bapi/nft/v1/friendly/nft/mystery-box/detail?productId=";
const URL_PURCHASE_PRODUCT = "https://www.binance.com/bapi/nft/v1/private/nft/mystery-box/purchase";
const URL_START = "https://binance.com/ru/nft";

const URL_PRODUCT_PAGE = "https://www.binance.com/ru/nft/mystery-box/detail?number=1&productId=";
const URL_AUCTION_PAGE = "https://www.binance.com/ru/nft/goods/mystery-box/detail?isOpen=true&itemId=";

const REQUESTS_COUNT = 250;

const puppeteer = require('puppeteer-extra')
const stealthPlugin = require('puppeteer-extra-plugin-stealth')

var config = require('./config.json');

var isUserSignIn = false;
var browser;
var mainPage;
var auctionPage;

var fakeHeaders;

// Product
var isProductInitialised = false;
var productID;
var productSaleTime;
var auctionPreparingTime;

var isAutoBuyEnabled = false;

var intervalUpdateID;

// Start programm
main();

// Main function
async function main()
{
	// Create browser
	await createBrowser();
	
	// Get product details
	await getProductDetails();

	// Wait for user sign in
	await waitForUserSignIn();
	
	// Wait for auction start
	await waitForAuctionStart();
	
	// Open auction page and steel captcha data
	await openAuctionPage();
	
	// Open product page
	await openProductPage();
	
	// Wait for sale start
	await waitForSaleStart();
	
	// Send purchase requests
	await purchaseProduct();
}

async function openProductPage()
{
	// Open product page
	await mainPage.goto(URL_PRODUCT_PAGE + config['mysteryBoxID']);
}

async function purchaseProduct()
{
	//const requestPostData = JSON.stringify({ number: 1, productId: config['mysteryBoxID'] });
	const requestPostDataString = 'number=1&productId=' + config['mysteryBoxID'];
	
	await mainPage.setRequestInterception(true);
	
	mainPage.on('request', request => 
	{		
		if(request.url().includes(PURCHASE_NETWORK_CALLBACK))
		{
			var data = 
			{
				 'method': 'POST',
				 'headers': fakeHeaders,
			};

			request.continue(data);
		}
	});
	
	for(let i = 0; i < REQUESTS_COUNT; i++)
	{
		mainPage.evaluate(() => 
		{
			fetch("https://www.binance.com/bapi/nft/v1/private/nft/mystery-box/purchase", {method: 'POST', body: JSON.stringify({ number: 1, productId: 163164431084832768 }) });
		});
	}
}

async function createBrowser()
{
	puppeteer.use(stealthPlugin());
	
	browser = await puppeteer.launch({
		headless: false,
		defaultViewport: null,
		devtools: true,
		args: ['--start-maximized'] 
	});
	
	mainPage = (await browser.pages())[0];
	
	await mainPage.setDefaultNavigationTimeout(0);
	
	console.log("[NFT BOT]: Browser created!");
}

async function openAuctionPage()
{
	var auctionURL = URL_AUCTION_PAGE + config['auctionProductID'];
	
	auctionPage = await browser.newPage();
	auctionPage.on('response', async response => {		
		if(response.url().includes(AUCTION_NETWORK_CALLBACK))
		{
			var headers = response.request().headers();

			var csrftoken = headers['csrftoken'];
			var cookie = headers['cookie'];
			var deviceInfo = headers['device-info'];
			var userAgent = headers['user-agent'];
			var xTraceID = headers['x-trace-id'];
			var xUIRequestTrace = headers['x-ui-request-trace'];
			var xCaptchaKey = headers['x-nft-checkbot-sitekey'];
			var xCaptchaToken = headers['x-nft-checkbot-token'];

			fakeHeaders = 
			{
				'Host': 'www.binance.com',
				'Accept': '*/*',
				'Accept-Language': 'ru,en-US;q=0.9,en;q=0.8,uk;q=0.7',
				'Accept-Encoding': 'gzip, deflate, br',
				'clienttype': 'web',
				'content-type': 'application/json',
				'x-trace-id': xTraceID,
				'x-ui-request-trace': xUIRequestTrace,
				'cookie': cookie,
				'csrftoken': csrftoken, 
				'device-info': deviceInfo,
				'user-agent': userAgent,
				'x-nft-checkbot-token': xCaptchaToken,
				'x-nft-checkbot-sitekey':xCaptchaKey,
			};

			console.log(fakeHeaders); 
			console.log("[NFT-NPC]: Captcha token has been stolen!");
			
			auctionPage.close();
		}
	});
	
	await auctionPage.setDefaultNavigationTimeout(0);
	
	await auctionPage.goto(auctionURL);
	
	await clickOnElement(auctionPage, '//*[@id="__APP"]/div/div[2]/main/div/div[2]/div[1]/div[2]/div[4]/div[2]/div/button[1]', 500);
	
	await delay(1000);
	
	await setValueToElement(auctionPage, '//*[@id="__APP"]/div/div[2]/main/div/div/div[6]/div[2]/div/div[1]/input', ['1', '6', '6', '9']);
	
	await delay(1000);
	
	await clickOnElement(auctionPage, '//*[@id="__APP"]/div/div[2]/main/div/div/div[9]/button[2]', 1500);
	
	await delay(1000);
	
	await clickOnElement(auctionPage, '/html/body/div[6]/div/div/div[8]/button[2]');
	
	await delay(5000);
	
	//await auctionPage.close();
}


async function getProductDetails()
{
	// Open product page
	mainPage.goto(URL_PRODUCT_PAGE + config['mysteryBoxID']);
	
	// Wait for product details response
	const productDetailsResponse = await mainPage.waitForResponse(response => response.url().includes(PRODUCT_NETWORK_CALLBACK));
	if(productDetailsResponse != null)
	{
		let productDetails = await productDetailsResponse.json();

		isProductInitialised = true;
		
		productID = config['mysteryBoxID'];
		
		productSaleTime = productDetails['data']['startTime'] - 3000;
		
		auctionPreparingTime = productSaleTime - 50000; // 50 seconds delay
				
		console.log("[NFT-NPC]: Product initialised!"); 
	}
}

async function waitForUserSignIn()
{
	// Wait for sign in response
	const signInResponse = await mainPage.waitForResponse(response => response.url().includes(LOGIN_NETWORK_CALLBACK));
	if(signInResponse != null)
	{
		isUserSignIn = true;
		
		console.log("[NFT-NPC]: A user signed in!"); 
	}
}

async function waitForAuctionStart()
{
	const poll = resolve => 
	{
		if(getCurrentUnixTime() >= auctionPreparingTime)
		{
			resolve();
		}
		else
		{
			setTimeout(() => poll(resolve), 500);
		}
		
		console.log("Milliseconds until auction start: " + (auctionPreparingTime - getCurrentUnixTime()));
	}

	return new Promise(poll);
}

async function waitForSaleStart()
{
	const poll = resolve => 
	{
		if(getCurrentUnixTime() >= productSaleTime)
		{
			resolve();
		}
		else
		{
			setTimeout(() => poll(resolve), 50);
		}
		
		console.log("Milliseconds until sale start: " + (productSaleTime - getCurrentUnixTime()));
	}

	return new Promise(poll);
}

// Extensions
async function clickOnElement(page, path, delay)
{
	await page.waitForXPath(path);
	
	const elementToClick = await page.$x(path);
	if(elementToClick != null)
	{
		await elementToClick[0].click({ 
			"button": "left",
			"delay": delay
		});	
	}
}

async function setValueToElement(page, path, keys)
{
	await page.waitForXPath(path);
	
	const elementToClick = await page.$x(path);
	if(elementToClick != null)
	{
		for(let i = 0; i < keys.length; i++)
		{
			await elementToClick[0].press(keys[i], { 
				"delay": 150
			});	
		}
	}
}

function getCurrentUnixTime()
{
	return (new Date()).getTime();
}

function until(conditionFunction) 
{
	const poll = resolve => {
		if(conditionFunction()) resolve();
		else setTimeout(_ => poll(resolve), 400);
	}

	return new Promise(poll);
}

function delay(time) 
{
   return new Promise(function(resolve) { 
       setTimeout(resolve, time)
   });
}