import { create } from 'zustand';

interface PdfStore {
    pdfToLoad: { url: string; filename: string, file_path: string } | null;
    setPdfToLoad: (pdf: { url: string; filename: string, file_path: string } | null) => void;
}

export const usePdfStore = create<PdfStore>((set) => ({
    pdfToLoad: null,
    setPdfToLoad: (pdf) => set({ pdfToLoad: pdf }),
}));
