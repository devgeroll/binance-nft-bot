const LOGIN_NETWORK_CALLBACK = "https://www.binance.com/bapi/accounts/v1/public/authcenter/callback";
const PRODUCT_NETWORK_CALLBACK = "https://www.binance.com/bapi/nft/v1/friendly/nft/mystery-box/detail?productId=";
const AUCTION_NETWORK_CALLBACK = "https://www.binance.com/bapi/nft/v1/private/nft/nft-trade/product-onsale";
const PURCHASE_NETWORK_CALLBACK = "https://www.binance.com/bapi/nft/v1/private/nft/mystery-box/purchase";
const TEXT_NETWORK_CALLBACK = "binance-chat";

const URL_PRODUCT_PAGE = "https://www.binance.com/ru/nft/mystery-box/detail?number=1&productId=";
const URL_AUCTION_PAGE = "https://www.binance.com/ru/nft/goods/mystery-box/detail?isOpen=true&itemId=";

const puppeteer = require('puppeteer-extra')
const stealthPlugin = require('puppeteer-extra-plugin-stealth')

var isDevModeEnabled = false;
var requestsCount = 350;

var config = require('./config.json');

var isUserSignIn = false;
var browser;
var mainPage;
var auctionPage;

var fakeHeaders;
var isHeadersStolen;

var isConfirmButtonTextStolen;
var confirmButtonText;

// Product
var isProductInitialised = false;
var productSaleTime;
var auctionPreparingTime;

// Start programm
main();

// Main function
async function main()
{
	// Init start arguments
	initStartArguments();

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

function initStartArguments()
{
	process.argv.forEach(element => 
	{
		if(element == '-dev')
		{
			console.log("[NFT-NPC]: DEV MODE IS ENABLED!");

			isDevModeEnabled = true;
			requestsCount = 1;
		}
	});
}

async function openProductPage()
{
	// Open product page
	await mainPage.goto(URL_PRODUCT_PAGE + config['mysteryBoxID']);
}

async function purchaseProduct()
{
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
	
	for(let i = 0; i < requestsCount; i++)
	{
		mainPage.evaluate((purchaseProductID) => 
		{
			window.bnvelidate.postBNHTTP('/bapi/nft/v1/private/nft/mystery-box/purchase', {number: 1, productId: purchaseProductID});
		}, config['mysteryBoxID']);
	}
}

async function createBrowser()
{
	puppeteer.use(stealthPlugin());
	
	browser = await puppeteer.launch({
		headless: false,
		defaultViewport: null,
		devtools: true,
		ignoreHTTPSErrors: true,
		args: ['--start-maximized', '--shm-size=2gb']
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
		if(response.url().includes(TEXT_NETWORK_CALLBACK))
		{
			var jsonResponse = await response.json();
			if(jsonResponse != null)
			{
				isConfirmButtonTextStolen = true;
				confirmButtonText = jsonResponse['chat5-popup-button-right-end'];
			}
		}
		else if(response.url().includes(AUCTION_NETWORK_CALLBACK))
		{
			var headers = response.request().headers();

			var csrftoken = headers['csrftoken'];
			var bncuuid = headers['bnc-uuid'];
			var fvideoid = headers['fvideo-id'];
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
				'bnc-uuid': bncuuid,
				'fvideo-id': fvideoid,
				'x-trace-id': xTraceID,
				'x-ui-request-trace': xUIRequestTrace,
				'cookie': cookie,
				'csrftoken': csrftoken, 
				'device-info': deviceInfo,
				'user-agent': userAgent,
				'x-nft-checkbot-token': xCaptchaToken,
				'x-nft-checkbot-sitekey':xCaptchaKey,
			};

			console.log("[NFT-NPC]: Captcha token has been stolen!");

			isHeadersStolen = true;
		}
	});
	
	await auctionPage.setDefaultNavigationTimeout(0);
	
	await auctionPage.goto(auctionURL);

	await waitForConfirmButtonText();
	
	await clickOnElement(auctionPage, '//*[@id="__APP"]/div/div[2]/main/div/div[2]/div[1]/div[2]/div[4]/div[2]/div/button[1]', 500);
	
	await delay(1000);
	
	await setValueToElement(auctionPage, '//*[@id="__APP"]/div/div[2]/main/div/div/div[6]/div[2]/div/div[1]/input', ['1', '6', '6', '9']);
	
	await delay(1000);
	
	await clickOnElement(auctionPage, '//*[@id="__APP"]/div/div[2]/main/div/div/div[9]/button[2]', 1500);
	
	await delay(1000);
	
	await clickOnElement(auctionPage, "//button[contains(text(), '" + confirmButtonText +"')]");

	await waitForFakeHeaders();
	
	await auctionPage.close();
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
				
		productSaleTime = productDetails['data']['startTime'] - 2000;

		// Testing mode
		if(isDevModeEnabled)
			productSaleTime = getCurrentUnixTime() + 60000;

		auctionPreparingTime = productSaleTime - 40000; // 40 seconds delay
				
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

async function waitForFakeHeaders()
{
	const poll = resolve => 
	{
		if(isHeadersStolen)
		{
			resolve();
		}
		else
		{
			setTimeout(() => poll(resolve), 1000);
		}
	}

	return new Promise(poll);
}

async function waitForConfirmButtonText()
{
	const poll = resolve => 
	{
		if(isConfirmButtonTextStolen)
		{
			resolve();
		}
		else
		{
			setTimeout(() => poll(resolve), 500);
		}
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