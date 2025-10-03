import React, { useState, useEffect } from 'react';
import { Search, TrendingUp, Clock, DollarSign, Loader2, FileText } from 'lucide-react';

interface Quote {
  id: string;
  partName: string;
  material: string;
  process: string;
  features?: string[];
  description?: string;
  price: number;
  leadTime: number;
  createdAt: string;
  similarity?: number;
}

interface SemanticSearchProps {
  quotes: Quote[];
  onQuoteSelect?: (quote: Quote) => void;
}

export const SemanticSearch: React.FC<SemanticSearchProps> = ({ quotes, onQuoteSelect }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Quote[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  useEffect(() => {
    // Load search history from localStorage
    const history = localStorage.getItem('searchHistory');
    if (history) {
      setSearchHistory(JSON.parse(history));
    }
  }, []);

  const performSearch = async () => {
    if (!query.trim() || isSearching) return;

    setIsSearching(true);

    try {
      const response = await fetch('/api/ai/search-quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query.trim(),
          quotes,
          limit: 10,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const quotesWithSimilarity = data.data.results.map((result: any) => {
          const quote = quotes.find(q => q.id === result.id);
          return {
            ...quote,
            similarity: result.similarity,
          };
        });

        setResults(quotesWithSimilarity);

        // Update search history
        const newHistory = [query.trim(), ...searchHistory.filter(h => h !== query.trim())].slice(0, 5);
        setSearchHistory(newHistory);
        localStorage.setItem('searchHistory', JSON.stringify(newHistory));
      } else {
        console.error('Search failed:', data.error);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      performSearch();
    }
  };

  const useHistoryQuery = (historyQuery: string) => {
    setQuery(historyQuery);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 0.9) return 'text-green-600 bg-green-50';
    if (similarity >= 0.8) return 'text-blue-600 bg-blue-50';
    if (similarity >= 0.7) return 'text-yellow-600 bg-yellow-50';
    return 'text-gray-600 bg-gray-50';
  };

  const getSimilarityLabel = (similarity: number) => {
    if (similarity >= 0.9) return 'Excellent Match';
    if (similarity >= 0.8) return 'Good Match';
    if (similarity >= 0.7) return 'Similar';
    return 'Related';
  };

  return (
    <div className="space-y-4">
      {/* Search Header */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6 border border-purple-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-white rounded-lg shadow-sm">
            <Search className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Semantic Quote Search</h3>
            <p className="text-sm text-gray-600">
              Find similar quotes using AI-powered natural language search
            </p>
          </div>
        </div>

        {/* Search Input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="e.g., 'aluminum parts with complex features' or 'stainless steel aerospace components'"
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 
                     focus:ring-purple-500 focus:border-transparent"
            disabled={isSearching}
          />
          <button
            onClick={performSearch}
            disabled={!query.trim() || isSearching}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 
                     disabled:cursor-not-allowed transition-colors flex items-center gap-2 font-medium"
          >
            {isSearching ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                Search
              </>
            )}
          </button>
        </div>

        {/* Search History */}
        {searchHistory.length > 0 && !isSearching && results.length === 0 && (
          <div className="mt-4">
            <p className="text-xs text-gray-500 mb-2">Recent searches:</p>
            <div className="flex flex-wrap gap-2">
              {searchHistory.map((histQuery, idx) => (
                <button
                  key={idx}
                  onClick={() => useHistoryQuery(histQuery)}
                  className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-full hover:border-purple-300 
                           hover:bg-purple-50 transition-colors"
                >
                  {histQuery}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-gray-900">
              Found {results.length} similar {results.length === 1 ? 'quote' : 'quotes'}
            </h4>
            <button
              onClick={() => setResults([])}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Clear results
            </button>
          </div>

          {results.map(quote => (
            <div
              key={quote.id}
              onClick={() => onQuoteSelect?.(quote)}
              className="bg-white rounded-lg border border-gray-200 hover:border-purple-300 hover:shadow-md 
                       transition-all cursor-pointer p-4"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="w-4 h-4 text-gray-400" />
                    <h5 className="font-semibold text-gray-900">{quote.partName}</h5>
                  </div>
                  <p className="text-sm text-gray-600">
                    {quote.material} • {quote.process}
                  </p>
                  {quote.description && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{quote.description}</p>
                  )}
                </div>

                {/* Similarity Badge */}
                {quote.similarity !== undefined && (
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${getSimilarityColor(quote.similarity)}`}>
                    {getSimilarityLabel(quote.similarity)} ({Math.round(quote.similarity * 100)}%)
                  </div>
                )}
              </div>

              {/* Features */}
              {quote.features && quote.features.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {quote.features.slice(0, 5).map((feature, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                    >
                      {feature}
                    </span>
                  ))}
                  {quote.features.length > 5 && (
                    <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                      +{quote.features.length - 5} more
                    </span>
                  )}
                </div>
              )}

              {/* Quote Details */}
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1 text-green-600">
                  <DollarSign className="w-4 h-4" />
                  <span className="font-semibold">${quote.price.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-1 text-blue-600">
                  <Clock className="w-4 h-4" />
                  <span>{quote.leadTime} days</span>
                </div>
                <div className="flex items-center gap-1 text-gray-500">
                  <TrendingUp className="w-4 h-4" />
                  <span>{formatDate(quote.createdAt)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No Results */}
      {!isSearching && query && results.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Search className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No similar quotes found</p>
          <p className="text-sm text-gray-500 mt-1">Try a different search query</p>
        </div>
      )}

      {/* Example Queries */}
      {!query && !isSearching && results.length === 0 && (
        <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
          <h5 className="font-semibold text-gray-900 mb-3">Try searching for:</h5>
          <div className="space-y-2">
            {[
              'High-precision aluminum parts for aerospace',
              'Stainless steel components with tight tolerances',
              'Large volume plastic injection molding',
              'Titanium medical device parts',
              'Complex sheet metal assemblies',
            ].map((example, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setQuery(example);
                  // Auto-search after a brief delay
                  setTimeout(() => {
                    setQuery(example);
                    performSearch();
                  }, 100);
                }}
                className="block w-full text-left px-4 py-2 bg-white border border-gray-200 rounded-lg 
                         hover:border-purple-300 hover:bg-purple-50 transition-colors text-sm"
              >
                💡 {example}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SemanticSearch;
