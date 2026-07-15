with open("src/ffu/hooks/useBatchOperations.ts", "r") as f:
    content = f.read()

content = content.replace(
'''      const zipBlob = await zip.generateAsync({ 
        type: 'blob',
        onUpdate: (metadata) => {
          setProgress(50 + Math.round(metadata.percent / 2)); // last 50% is zipping
        }
      });''',
'''      const zipBlob = await zip.generateAsync({ type: 'blob' }, (metadata) => {
          setProgress(50 + Math.round(metadata.percent / 2)); // last 50% is zipping
      });'''
)

with open("src/ffu/hooks/useBatchOperations.ts", "w") as f:
    f.write(content)
