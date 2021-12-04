const LOGIN_NETWORK_CALLBACK = "https://www.binance.com/bapi/accounts/v1/public/authcenter/callback";
const PRODUCT_NETWORK_CALLBACK = "https://www.binance.com/bapi/nft/v1/friendly/nft/mystery-box/detail?productId=";

const URL_GET_PRODUCT_DETAILS = "https://www.binance.com/bapi/nft/v1/friendly/nft/mystery-box/detail?productId=";
const URL_PURCHASE_PRODUCT = "https://www.binance.com/bapi/nft/v1/private/nft/mystery-box/purchase";

const AUCTION_PRODUCT_ID = "153057830831042560";

const puppeteer = require('puppeteer');

var isUserSignIn = false;
var browser;
var mainPage;
var auctionPage;

// Product
var isProductInitialised = false;
var productID;
var productSaleTime;

var isAutoBuyEnabled = false;

var intervalUpdateID;

async function createBrowser()
{
	browser = await puppeteer.launch({
		headless: false,
		defaultViewport: null,
		args: ['--start-maximized'] 
	});
	
	mainPage = (await browser.pages())[0];
	
	mainPage.on('response', async (response) => 
	{
        const headers = response.headers();
		
		let urlText = response.url();
		if(urlText.includes(LOGIN_NETWORK_CALLBACK))
		{
			console.log("LOG IN!");
			
			isUserSignIn = true;
			
			openAuctionPage();
		}
		else if(urlText.includes(PRODUCT_NETWORK_CALLBACK))
		{
			const jsonResponse = await response.json();
			
			await initProduct(urlText.replace(PRODUCT_NETWORK_CALLBACK, ''), jsonResponse);
		}
    });
	
	const url = "https://binance.com/ru/nft";
	
	await mainPage.goto(url);
	
	await mainPage.waitFor(3000);
	await mainPage.hover("/html/body/div[2]/div/div/div[3]/button[2]");
}

async function initProduct(id, productData)
{	
	console.log("Product ID: " + id); 
	
	isProductInitialised = true;
	
	productID = id;
	
	productSaleTime = productData['data']['startTime'];
	productSaleTime = getCurrentUnixTime() + 3000;
	
	console.log(productData);
	
	//await createDebugPanel();
}

async function createDebugPanel()
{
	await mainPage.evaluate(() => {
		var html = '<div id="auto-buy-panel"><span id="autobuy-button">Start Purchasing</span></div> <style>#auto-buy-panel {width: 300px;height: auto;display: block;position: fixed;right: 10px;top: 80px;background: #fafafa;border-radius: 5px;box-shadow: rgb(0 0 0 / 24%) 0px 3px 8px;padding: 12px;}#autobuy-button {padding: 0.5px 8px;color: #fff;text-decoration: none;background: #18deaf;transition: background .1s linear;border-radius: 4px;font-weight: 700;font-size: 14px;line-height: 32px;cursor: pointer;margin: 0 auto;display: table;}#autobuy-button.active {background: #ef3030;}</style>';
		
		var panelDiv = document.createElement("div");
		
		document.body.appendChild(panelDiv);
		
		panelDiv.innerHTML = html;
	});
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
	var auctionURL = "https://www.binance.com/ru/nft/goods/mystery-box/detail?itemId=" + AUCTION_PRODUCT_ID + "&isOpen=true";
	auctionPage = await browser.newPage();
		
	auctionPage.on('response', async (response) => 
	{
		console.log(response.url());
		
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

// LOGIC

main();

async function main()
{
	await createBrowser();

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