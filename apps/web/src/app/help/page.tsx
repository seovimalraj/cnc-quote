'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  MagnifyingGlassIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import type { HelpArticle } from '@/types/order';
import { trackEvent } from '@/lib/analytics/posthog';

const CATEGORIES = [
  'Getting Started',
  'File Formats',
  'Pricing Rules',
  'DFM Guide',
  'Payments',
  'Orders',
  'Privacy & Security'
] as const;

const POPULAR_ARTICLES = [
  { slug: 'getting-started', title: 'Getting Started with CNC Quotes', category: 'Getting Started' },
  { slug: 'file-formats', title: 'Supported CAD File Formats', category: 'File Formats' },
  { slug: 'dfm-basics', title: 'Design for Manufacturability Guide', category: 'DFM Guide' },
  { slug: 'pricing-rules', title: 'How Pricing Works', category: 'Pricing Rules' }
];

export default function HelpCenterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [articles, setArticles] = useState<HelpArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchResults, setSearchResults] = useState<HelpArticle[]>([]);

  // Mock data for development
  const mockArticles: HelpArticle[] = [
    {
      id: '1',
      slug: 'getting-started',
      title: 'Getting Started with CNC Quotes',
      category: 'Getting Started',
      body_md: '# Getting Started\n\nWelcome to CNC Quotes...',
      last_updated: '2024-09-01T00:00:00Z',
      related_ids: ['2', '3']
    },
    {
      id: '2',
      slug: 'file-formats',
      title: 'Supported CAD File Formats',
      category: 'File Formats',
      body_md: '# File Formats\n\nWe support the following formats...',
      last_updated: '2024-09-02T00:00:00Z',
      related_ids: ['1']
    }
  ];

  useEffect(() => {
    // Track page view
    trackEvent('help_view', { category: selectedCategory });

    // Load articles
    setTimeout(() => {
      setArticles(mockArticles);
      setLoading(false);
    }, 500);
  }, [selectedCategory]);

  const handleSearch = useCallback((query: string) => {
    if (query.trim()) {
      trackEvent('help_search', { query, category: selectedCategory });
      // Mock search results
      const results = mockArticles.filter(article =>
        article.title.toLowerCase().includes(query.toLowerCase()) ||
        article.body_md.toLowerCase().includes(query.toLowerCase())
      );
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  }, [selectedCategory]);

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    trackEvent('help_category_selected', { category });
  };

  const handleArticleClick = (article: HelpArticle) => {
    trackEvent('help_article_view', { article_id: article.id, category: article.category });
    router.push(`/help/${article.slug}`);
  };

  const displayArticles = searchQuery ? searchResults : articles.filter(article =>
    !selectedCategory || article.category === selectedCategory
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/portal/dashboard')}
                className="flex items-center space-x-2"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                <span>Back to Dashboard</span>
              </Button>
            </div>

            <div className="flex-1 max-w-md mx-4">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search help & DFM guides… (⌘/)"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    handleSearch(e.target.value);
                  }}
                  className="pl-10"
                  onKeyDown={(e) => {
                    if (e.key === '/' && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      (e.target as HTMLInputElement).focus();
                    }
                  }}
                />
              </div>
            </div>

            <Button
              onClick={() => router.push('/help/contact')}
              className="flex items-center space-x-2"
            >
              <ChatBubbleLeftRightIcon className="w-4 h-4" />
              <span>Contact Support</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Categories</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant={selectedCategory === null ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setSelectedCategory(null)}
                >
                  All Articles
                </Button>
                {CATEGORIES.map((category) => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => handleCategorySelect(category)}
                  >
                    {category}
                  </Button>
                ))}
              </CardContent>
            </Card>

            {/* Popular Articles */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">Popular Articles</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {POPULAR_ARTICLES.map((article) => (
                  <button
                    key={article.slug}
                    onClick={() => handleArticleClick({ ...article, id: article.slug, body_md: '', last_updated: '', related_ids: [] })}
                    className="text-left w-full hover:bg-gray-50 p-2 rounded transition-colors"
                  >
                    <div className="font-medium text-sm text-gray-900">{article.title}</div>
                    <Badge variant="secondary" className="text-xs mt-1">
                      {article.category}
                    </Badge>
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="space-y-6">
              {/* Search Results Header */}
              {searchQuery && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Search Results for "{searchQuery}"
                  </h2>
                  <p className="text-gray-600 mt-1">
                    {searchResults.length} articles found
                  </p>
                </div>
              )}

              {/* Articles List */}
              {loading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <Card key={i}>
                      <CardContent className="p-6">
                        <Skeleton className="h-6 w-3/4 mb-2" />
                        <Skeleton className="h-4 w-1/2 mb-4" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-2/3" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {displayArticles.map((article) => (
                    <Card key={article.id} className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                              {article.title}
                            </h3>
                            <Badge variant="outline" className="mb-3">
                              {article.category}
                            </Badge>
                            <p className="text-gray-600 text-sm line-clamp-2">
                              {article.body_md.replace(/#/g, '').substring(0, 150)}...
                            </p>
                          </div>
                          <DocumentTextIcon className="w-5 h-5 text-gray-400 flex-shrink-0 ml-4" />
                        </div>
                        <div className="flex items-center justify-between mt-4">
                          <span className="text-xs text-gray-500">
                            Updated {new Date(article.last_updated).toLocaleDateString()}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleArticleClick(article)}
                          >
                            Read More →
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {displayArticles.length === 0 && (
                    <Card>
                      <CardContent className="p-8 text-center">
                        <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          {searchQuery ? 'No articles found' : 'No articles in this category'}
                        </h3>
                        <p className="text-gray-600">
                          {searchQuery
                            ? 'Try adjusting your search terms or browse all articles.'
                            : 'Check back later for new content.'
                          }
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
