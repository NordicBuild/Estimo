const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
  page.on('response', response => {
    if (response.status() >= 400) {
      console.log('Error URL:', response.url(), response.status());
    }
  });
  
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  
  await page.evaluate(async () => {
    const links = Array.from(document.querySelectorAll('button, a, div, span'));
    const bimTab = links.find(el => el.textContent && el.textContent.trim() === 'BIM-Mätning');
    if (bimTab) { 
        bimTab.click(); 
        console.log("Clicked BIM-Mätning");
    }
  });
  
  await new Promise(r => setTimeout(r, 2000));
  
  const fileInput = await page.$('input[type="file"]');
  if (fileInput) {
     console.log("Uploading cube.ifc...");
     await fileInput.uploadFile(path.resolve('./cube.ifc'));
     await new Promise(r => setTimeout(r, 8000)); // wait for processing
     
     const canvas = await page.$('canvas');
     console.log(canvas ? "Canvas is present" : "No canvas found");
  } else {
     console.log("File input not found");
  }
  
  await browser.close();
})();
