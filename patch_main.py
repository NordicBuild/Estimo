import re

with open("src/main.tsx", "r") as f:
    content = f.read()

sw_registration = """

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(
      (registration) => {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
      },
      (err) => {
        console.log('ServiceWorker registration failed: ', err);
      }
    );
  });
}
"""

content = content + sw_registration

with open("src/main.tsx", "w") as f:
    f.write(content)
