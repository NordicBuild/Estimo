import { ProjectDocument } from '../store/useFfuStore';

export interface SearchFilters {
  type?: string;
  tags?: string[];
  dateFrom?: string;
  dateTo?: string;
}

export function buildSearchIndex(documents: ProjectDocument[]) {
  return documents;
}

export function search(documents: ProjectDocument[], query: string, filters?: SearchFilters): (ProjectDocument & { score: number })[] {
  const lowerQuery = query.toLowerCase().trim();
  const tokens = lowerQuery.split(/\s+/).filter(Boolean);

  let results = documents.map(doc => {
    let score = 0;
    const lowerFilename = doc.filename.toLowerCase();
    const docTags = (doc.tags || []).map(t => t.toLowerCase());

    if (tokens.length > 0) {
      tokens.forEach(token => {
        if (lowerFilename.includes(token)) score += 10;
        if (lowerFilename.startsWith(token)) score += 5;
        if (docTags.some(t => t.includes(token))) score += 5;
        if (doc.document_type.toLowerCase().includes(token)) score += 2;
      });
    } else {
      score = 1;
    }

    return { ...doc, score };
  });

  if (tokens.length > 0) {
    results = results.filter(r => r.score > 0);
  }

  if (filters) {
    if (filters.type && filters.type !== 'all') {
      results = results.filter(r => r.document_type === filters.type);
    }
    if (filters.tags && filters.tags.length > 0) {
      results = results.filter(r => 
        filters.tags!.every(ft => (r.tags || []).includes(ft))
      );
    }
  }

  return results.sort((a, b) => b.score - a.score);
}

export function suggestTags(filename: string): string[] {
  const tags = new Set<string>();
  const words = filename.split(/[\s_\-\.]+/);
  
  words.forEach(word => {
    if (word.length < 2) return;
    
    const lower = word.toLowerCase();
    if (['plan', 'sektion', 'fasad', 'detalj', 'ritning', 'k-ritning', 'a-ritning', 'vvs', 'el'].includes(lower)) {
      tags.add(lower);
    }
    
    if (/^\d+$/.test(word)) {
      tags.add(`del ${word}`);
    }

    if (/^[A-Z][a-z]+$/.test(word)) {
      tags.add(lower);
    }
  });

  if (filename.toLowerCase().includes('pdf')) {
    tags.add('pdf');
  }

  return Array.from(tags);
}
