const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
  page.on('response', response => {
    if (response.status() >= 400 && response.url().includes('.wasm')) {
      console.log('Error URL:', response.url(), response.status());
    }
  });
  
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  
  // bypass auth if needed? Let's just evaluate
  await page.evaluate(async () => {
    // If there's a button with text "Logga in" or something
    // wait, we can just call the IFC loader directly!
  });
  
  // Actually, we can inject a script to test BIMScene
  await page.evaluate(async () => {
     try {
         // Create a canvas
         const canvas = document.createElement('canvas');
         document.body.appendChild(canvas);
         // Can we access BIMScene? No, it's bundled.
     } catch(e) {
         console.error(e);
     }
  });
  
  await browser.close();
})();
