import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Star, Filter, FileText } from 'lucide-react';
import { useDocumentSearch, useSavedSearches } from '../../ffu/search/hooks';

export function SearchBox({ projectId, onSelectDocument }: { projectId: string | null, onSelectDocument?: (doc: any) => void }) {
  const { query, setQuery, filters, setFilters, results, isLoading } = useDocumentSearch(projectId);
  const { savedSearches, saveSearch } = useSavedSearches();
  
  const [isFocused, setIsFocused] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [saveName, setSaveName] = useState('');
  
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full max-w-2xl" ref={containerRef}>
      <div className={`relative flex items-center w-full bg-white border rounded-lg transition-shadow ${isFocused ? 'ring-2 ring-blue-500 border-blue-500 shadow-md' : 'border-gray-300 shadow-sm'}`}>
        <Search className="w-5 h-5 ml-3 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          placeholder="Sök i filnamn, kommentarer och taggar..."
          className="flex-1 px-3 py-2.5 bg-transparent border-none focus:outline-none text-sm text-gray-800"
          aria-label="Sök dokument"
        />
        {query && (
          <button onClick={() => setQuery('')} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full">
            <X className="w-4 h-4" />
          </button>
        )}
        <div className="w-px h-6 bg-gray-200 mx-1"></div>
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 px-3 py-1.5 mr-1.5 text-sm font-medium rounded-md transition-colors ${Object.keys(filters).length > 0 || showFilters ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
        >
          <Filter className="w-4 h-4" />
          Filter
        </button>
      </div>

      {isFocused && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden flex flex-col max-h-96">
          
          {showFilters && (
            <div className="p-3 border-b bg-gray-50 flex flex-wrap gap-2 items-center">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider w-full mb-1">Filtrera på typ</span>
              {['alla', 'ritning', 'mätning', 'instruktion'].map(t => (
                <button
                  key={t}
                  onClick={() => setFilters(t === 'alla' ? {} : { ...filters, type: t })}
                  className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                    (filters.type === t) || (t === 'alla' && !filters.type)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
              
              {query && (
                <div className="w-full mt-2 pt-2 border-t flex items-center gap-2">
                  <input 
                    type="text" 
                    placeholder="Namnge sökning" 
                    value={saveName} 
                    onChange={e => setSaveName(e.target.value)}
                    className="flex-1 px-2 py-1 text-xs border rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                  <button 
                    onClick={() => { if(saveName) { saveSearch(saveName, query, filters); setSaveName(''); } }}
                    className="px-3 py-1 bg-gray-800 text-white text-xs rounded hover:bg-gray-700 transition-colors"
                  >
                    Spara sökning
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="overflow-y-auto flex-1 p-2">
            {!query && !isLoading && savedSearches.length > 0 && (
              <div className="mb-4">
                <div className="text-xs font-semibold text-gray-500 px-2 py-1 mb-1">Sparade sökningar</div>
                {savedSearches.map(s => (
                  <button
                    key={s.id}
                    onClick={() => { setQuery(s.query); setFilters(s.filters); }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-gray-100 rounded text-left text-sm text-gray-700"
                  >
                    <Star className="w-4 h-4 text-yellow-500" />
                    <span>{s.name}</span>
                    <span className="text-gray-400 text-xs ml-auto">"{s.query}"</span>
                  </button>
                ))}
              </div>
            )}

            {isLoading && (
              <div className="p-4 text-center text-sm text-gray-500 animate-pulse">Söker...</div>
            )}

            {!isLoading && results.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-gray-500 px-2 py-1 mb-1">Resultat ({results.length})</div>
                {results.map(doc => (
                  <button
                    key={doc.id}
                    onClick={() => {
                      onSelectDocument?.(doc);
                      setIsFocused(false);
                    }}
                    className="w-full flex flex-col px-2 py-2 hover:bg-blue-50 rounded text-left group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900 group-hover:text-blue-700 flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-gray-400" />
                        {doc.filename}
                      </span>
                      {doc.score && <span className="text-xs text-gray-400">Score: {doc.score}</span>}
                    </div>
                    {(doc.tags && doc.tags.length > 0) && (
                      <div className="flex gap-1 mt-1.5 pl-5.5">
                        {doc.tags.map((t: string) => (
                          <span key={t} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-[10px] rounded uppercase tracking-wide">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {!isLoading && query && results.length === 0 && (
              <div className="p-4 text-center text-sm text-gray-500">Inga dokument hittades för "{query}"</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
