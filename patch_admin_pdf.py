import re

with open("src/components/Ffu/AdminDashboard.tsx", "r") as f:
    content = f.read()

content = content.replace("import html2pdf from 'html2pdf.js';", "")

content = content.replace(
    """  const exportToPDF = () => {
    if (!reportRef.current) return;
    const opt = {
      margin:       10,
      filename:     `Admin_Report_${new Date().toISOString().split('T')[0]}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2 },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };
    html2pdf().from(reportRef.current).set(opt).save();
  };""",
    """  const exportToPDF = async () => {
    if (!reportRef.current) return;
    // @ts-ignore
    const html2pdf = (await import('html2pdf.js')).default;
    const opt = {
      margin:       10,
      filename:     `Admin_Report_${new Date().toISOString().split('T')[0]}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2 },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };
    html2pdf().from(reportRef.current).set(opt).save();
  };"""
)

with open("src/components/Ffu/AdminDashboard.tsx", "w") as f:
    f.write(content)
