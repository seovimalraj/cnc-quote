'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Home, ShoppingCart, Package, Clock, TrendingUp } from 'lucide-react';

export default function DemoNavigation() {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-3 space-y-2">
        <div className="text-xs font-semibold text-gray-500 mb-2">Demo Quick Links</div>
        
        <Link href="/instant-quote-v2">
          <Button variant="outline" size="sm" className="w-full justify-start">
            <ShoppingCart className="w-4 h-4 mr-2" />
            New Quote
          </Button>
        </Link>

        <Link href="/portal/orders">
          <Button variant="outline" size="sm" className="w-full justify-start">
            <Package className="w-4 h-4 mr-2" />
            Customer Orders
          </Button>
        </Link>

        <Link href="/supplier/rfqs">
          <Button variant="outline" size="sm" className="w-full justify-start">
            <Clock className="w-4 h-4 mr-2" />
            Supplier RFQs
            <Badge className="ml-auto bg-red-500 text-white border-0 px-1.5 text-xs">3</Badge>
          </Button>
        </Link>

        <Link href="/admin/bids">
          <Button variant="outline" size="sm" className="w-full justify-start">
            <TrendingUp className="w-4 h-4 mr-2" />
            Admin Bids
            <Badge className="ml-auto bg-red-500 text-white border-0 px-1.5 text-xs">5</Badge>
          </Button>
        </Link>

        <div className="pt-2 border-t">
          <Link href="/instant-quote">
            <Button variant="ghost" size="sm" className="w-full justify-start text-xs">
              <Home className="w-3 h-3 mr-2" />
              Original Quote Page
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
