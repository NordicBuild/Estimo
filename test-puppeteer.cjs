const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });

  await page.evaluate(async () => {
    try {
      const { IFCLoader } = await import('three/examples/jsm/loaders/IFCLoader.js').catch(e => {
         console.log("No built-in IFCLoader, importing web-ifc-three");
         return window.IFCLoaderMock || {}; 
      });
      console.log("Page evaluates fine.");
    } catch(e) { console.log(e.toString()); }
  });

  await browser.close();
})();
