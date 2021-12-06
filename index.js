const LOGIN_NETWORK_CALLBACK = "https://www.binance.com/bapi/accounts/v1/public/authcenter/callback";
const PRODUCT_NETWORK_CALLBACK = "https://www.binance.com/bapi/nft/v1/friendly/nft/mystery-box/detail?productId=";

const DEV_CALLBACK = "https://www.binance.com/bapi/accounts/v1/public/authcenter/auth";

const URL_GET_PRODUCT_DETAILS = "https://www.binance.com/bapi/nft/v1/friendly/nft/mystery-box/detail?productId=";
const URL_PURCHASE_PRODUCT = "https://www.binance.com/bapi/nft/v1/private/nft/mystery-box/purchase";
const URL_START = "https://binance.com/ru/nft";

const URL_PRODUCT_PAGE = "https://www.binance.com/ru/nft/mystery-box/detail?number=1&productId=";
const URL_AUCTION_PAGE = "https://www.binance.com/ru/nft/goods/mystery-box/detail?isOpen=true&itemId=";

const puppeteer = require('puppeteer-extra')
const stealthPlugin = require('puppeteer-extra-plugin-stealth')

var config = require('./config.json');

var isUserSignIn = false;
var browser;
var mainPage;
var auctionPage;

// Product
var isProductInitialised = false;
var productID;
var productSaleTime;
var auctionPreparingTime;

var isAutoBuyEnabled = false;

var intervalUpdateID;


async function createBrowser()
{
	puppeteer.use(stealthPlugin());
	
	browser = await puppeteer.launch({
		headless: false,
		defaultViewport: null,
		args: ['--start-maximized'] 
	});
	
	mainPage = (await browser.pages())[0];
	
	console.log("[NFT BOT]: Browser created!");
}

async function waitForPurchase()
{
	intervalUpdateID = setInterval(function()
	{
		if(isProductInitialised)
		{
			if(getCurrentUnixTime() >= productSaleTime)
			{
				console.log("purchase");
			}
			
			console.log("Milliseconds until purchase: " + (productSaleTime - getCurrentUnixTime()));
		}
	}, 50);
}

async function openAuctionPage()
{
	var auctionURL = URL_AUCTION_PAGE + config['auctionProductID'];
	auctionPage = await browser.newPage();
		
	auctionPage.on('response', async (response) => 
	{
		console.log(response);
		
        const headers = response.headers();
		
		let urlText = response.url();
    });
	
	await auctionPage.goto(auctionURL);
	await auctionPage.waitFor(3000);
	
	await auctionPage.evaluate(() => {
	  const xpath = "//*[@id='__APP']/div/div[2]/main/div/div[2]/div[1]/div[2]/div[4]/div[2]/div/button[1]";
	  const result = document.evaluate(xpath, document, null, XPathResult.ANY_TYPE, null);

	  result.iterateNext().click();
	});
}

async function getElementByPath(page, path)
{
	return await page.evaluate(async () => {
		return await new Promise(resolve => {
			return document.evaluate(path, document, null, XPathResult.ANY_TYPE, null);
		});
	});
}

// LOGIC

main();

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
		
		productSaleTime = productDetails['data']['startTime'];
		productSaleTime = getCurrentUnixTime() + (60000); // DEV
		
		auctionPreparingTime = productSaleTime - 50000; // 50 seconds delay
		
		console.log(productDetails);
		
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
			setTimeout(() => poll(resolve), 500);
		}
		
		console.log("Milliseconds until purchase: " + (productSaleTime - getCurrentUnixTime()));
	}

	return new Promise(poll);
}

async function main()
{
	// Create browser
	await createBrowser();
	
	await mainPage.waitFor(3000);
	
	// Open product page
	mainPage.goto(URL_PRODUCT_PAGE + config['mysteryBoxID']);
	
	// Steal data
	const productDetailsResponse = await mainPage.waitForResponse(response => response.url().includes(DEV_CALLBACK));
	if(productDetailsResponse != null)
	{
		var headers = productDetailsResponse.request().headers();
		
		console.log(headers); 
		console.log(headers['csrftoken']); 
		
		var csrftoken = headers['csrftoken'];
		var cookie = headers['cookie'];
		var deviceInfo = headers['device-info'];
		var userAgent = headers['user-agent'];
		var xTraceID = headers['x-trace-id'];
		var xUIRequestTrace = headers['x-ui-request-trace'];
		
		var headers = 
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
			'user-agent': userAgent
		};
		
		await mainPage.setRequestInterception(true);
		
		mainPage.on('request', request => 
		{
			console.log(request.url());
			
			if(request.url().includes(DEV_CALLBACK))
			{
				var data = 
				{
					 'method': 'POST',
					 'postData': JSON.stringify(null),
					 'headers': headers,
				};

				request.continue(data);
			}
		});
		
		const result = await mainPage.evaluate(() => {
			return fetch('https://www.binance.com/bapi/accounts/v1/public/authcenter/auth', {method: 'POST' }).then(res => res.json());
		});
		
		console.log(result);
	}
	
	return;
	
	
	// Get product details
	await getProductDetails();
	
	// Wait for user sign in
	await waitForUserSignIn();
	
	// Wait for sale start
	await waitForSaleStart();
	
	// Open auction page and steel captcha data
	await openAuctionPage();
	
	// Wait for sale start
	// wait();
	
	// Send purchase requests
	// purchaseProduct();
	
	//await until(() => isUserSignIn == true);	
	
	return;
	
	// Open auction page
	await openAuctionPage();
	
	var path = "/html/body/div[2]/div/div/div[3]/button[2]";
	
	await mainPage.waitForXPath(path);
	
	const elementToClick = await mainPage.$x(path);
	
	//await mainPage.hover(elementToClick);
	
	await elementToClick[0].click({ 
		"button": "left",
		"delay": 50
	});
	
	console.log(elementToClick[0]);
	
	// var ddata = await getElementByPath(mainPage, "//*[@id='__APP']/div/div[2]/main/div/div[2]/div[1]/div[2]/div[4]/div[2]/div/button[1]");
	// console.log(ddata);
	
	// await mainPage.hover("/html/body/div[2]/div/div/div[3]/button[2]");

	// // Wait for login and product page
	// while(true)
	// {
		// if(isUserSignIn && isProductInitialised)
		// {
			// openAuctionPage();
			
			// break;
		// }
	// }
}

//waitForPurchase();

// Extensions
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