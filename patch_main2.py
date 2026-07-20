import re

with open("src/main.tsx", "r") as f:
    content = f.read()

sw_registration = """
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(
      (registration) => {
        console.log('ServiceWorker registration successful');
        if ('Notification' in window && Notification.permission === 'default') {
          Notification.requestPermission();
        }
      }
    );
  });
}
"""

content = re.sub(r"if \('serviceWorker' in navigator\) \{.*\}\n", sw_registration, content, flags=re.DOTALL)

with open("src/main.tsx", "w") as f:
    f.write(content)
