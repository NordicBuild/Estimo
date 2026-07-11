const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
  
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  
  await page.evaluate(async () => {
    const links = Array.from(document.querySelectorAll('button, a, div, span'));
    const bimTab = links.find(el => el.textContent && el.textContent.trim() === 'BIM-Mätning');
    if (bimTab) { 
        bimTab.click(); 
        console.log("Clicked BIM-Mätning");
    } else {
        console.log("No BIM tab found");
    }
  });
  
  await new Promise(r => setTimeout(r, 2000));
  
  const fileInput = await page.$('input[type="file"]');
  if (fileInput) {
     console.log("Uploading cube.ifc...");
     await fileInput.uploadFile('./cube.ifc');
     await new Promise(r => setTimeout(r, 5000)); // wait for processing
     
     const canvas = await page.$('canvas');
     console.log(canvas ? "Canvas is present" : "No canvas found");
  } else {
     console.log("File input not found");
  }
  
  await browser.close();
})();
