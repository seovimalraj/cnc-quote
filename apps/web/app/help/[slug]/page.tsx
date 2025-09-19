'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeftIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import type { HelpArticle } from '@/types/order';
import { trackEvent } from '@/lib/analytics/posthog';

interface HelpArticlePageProps {
  params: {
    slug: string;
  };
}

export default function HelpArticlePage({ params }: HelpArticlePageProps) {
  const router = useRouter();
  const [article, setArticle] = useState<HelpArticle | null>(null);
  const [relatedArticles, setRelatedArticles] = useState<HelpArticle[]>([]);
  const [loading, setLoading] = useState(true);

  // Mock data for development
  const mockArticle: HelpArticle = {
    id: '1',
    slug: params.slug,
    title: 'Getting Started with CNC Quotes',
    category: 'Getting Started',
    body_md: `# Getting Started with CNC Quotes

Welcome to CNC Quotes! This guide will help you get started with our platform and understand how to get accurate quotes for your CNC machining projects.

## What is CNC Machining?

CNC (Computer Numerical Control) machining is a manufacturing process that uses computerized controls to operate and manipulate machine tools. This technology allows for precise and repeatable production of complex parts.

## Getting Your First Quote

### Step 1: Prepare Your CAD Files
- Ensure your design is in a supported format (STEP, STP, IGES, STL)
- Check your design against our DFM guidelines
- Remove any unnecessary features that could increase cost

### Step 2: Upload Your Files
- Drag and drop your CAD files onto our upload area
- Add any special instructions or requirements
- Specify material preferences if you have them

### Step 3: Review Your Quote
- Our system will analyze your design automatically
- You'll receive pricing within seconds for simple parts
- Complex parts may take up to 20 seconds for full analysis

## Understanding Your Quote

### Pricing Factors
- **Material**: Different materials have different costs
- **Complexity**: More complex geometries require more machining time
- **Quantity**: Larger quantities can reduce per-part costs
- **Tolerances**: Tighter tolerances increase manufacturing difficulty

### What's Included
- Complete machining of your part
- Material selection and procurement
- Quality control and inspection
- Packaging and shipping preparation

## Next Steps

Once you have your quote, you can:
1. Proceed to checkout if you're satisfied with the pricing
2. Request design modifications if needed
3. Contact our support team for questions

## Need Help?

If you have any questions or need assistance, don't hesitate to [contact our support team](/help/contact).

---

*Last updated: September 1, 2024*`,
    last_updated: '2024-09-01T00:00:00Z',
    related_ids: ['2', '3']
  };

  const mockRelatedArticles: HelpArticle[] = [
    {
      id: '2',
      slug: 'file-formats',
      title: 'Supported CAD File Formats',
      category: 'File Formats',
      body_md: '',
      last_updated: '2024-09-02T00:00:00Z',
      related_ids: []
    },
    {
      id: '3',
      slug: 'dfm-basics',
      title: 'Design for Manufacturability Guide',
      category: 'DFM Guide',
      body_md: '',
      last_updated: '2024-09-03T00:00:00Z',
      related_ids: []
    }
  ];

  useEffect(() => {
    // Track article view
    trackEvent('help_article_view', { slug: params.slug });

    // Load article
    setTimeout(() => {
      setArticle(mockArticle);
      setRelatedArticles(mockRelatedArticles);
      setLoading(false);
    }, 300);
  }, [params.slug]);

  const handleRelatedArticleClick = (relatedArticle: HelpArticle) => {
    trackEvent('help_related_article_click', {
      from_slug: params.slug,
      to_slug: relatedArticle.slug
    });
    router.push(`/help/${relatedArticle.slug}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <DocumentTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Article Not Found</h3>
            <p className="text-gray-600 mb-4">
              The help article you're looking for doesn't exist.
            </p>
            <Button onClick={() => router.push('/help')}>
              Back to Help Center
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
                onClick={() => router.push('/help')}
                className="flex items-center space-x-2"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                <span>Back to Help</span>
              </Button>
              <div className="h-4 w-px bg-gray-300" />
              <Badge variant="outline">{article.category}</Badge>
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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            <article className="prose prose-gray max-w-none">
              <header className="not-prose mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-4">
                  {article.title}
                </h1>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span>Updated {new Date(article.last_updated).toLocaleDateString()}</span>
                  <span>•</span>
                  <span>{article.category}</span>
                </div>
              </header>

              {/* Article Content */}
              <div
                className="prose-headings:font-semibold prose-headings:text-gray-900 prose-p:text-gray-700 prose-p:leading-relaxed prose-strong:text-gray-900 prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-ul:text-gray-700 prose-ol:text-gray-700"
                dangerouslySetInnerHTML={{
                  __html: article.body_md
                    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
                    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
                    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
                    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*(.+?)\*/g, '<em>$1</em>')
                    .replace(/`(.+?)`/g, '<code>$1</code>')
                    .replace(/^- (.+)$/gm, '<li>$1</li>')
                    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
                    .replace(/\n\n/g, '</p><p>')
                    .replace(/^(.+)$/gm, '<p>$1</p>')
                    .replace(/<p><\/p>/g, '')
                }}
              />
            </article>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Related Articles */}
            {relatedArticles.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Related Articles</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {relatedArticles.map((relatedArticle) => (
                    <button
                      key={relatedArticle.id}
                      onClick={() => handleRelatedArticleClick(relatedArticle)}
                      className="text-left w-full hover:bg-gray-50 p-3 rounded transition-colors group"
                    >
                      <div className="font-medium text-sm text-gray-900 group-hover:text-blue-600">
                        {relatedArticle.title}
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {relatedArticle.category}
                        </Badge>
                        <ArrowRightIcon className="w-3 h-3 text-gray-400 group-hover:text-blue-600" />
                      </div>
                    </button>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Contact Support */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">Need More Help?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Can't find what you're looking for? Our support team is here to help.
                </p>
                <Button
                  onClick={() => router.push('/help/contact')}
                  className="w-full"
                >
                  Contact Support
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
