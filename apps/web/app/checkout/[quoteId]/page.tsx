'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, MapPin, Package, Clock, DollarSign, 
  CheckCircle, ShoppingCart, ArrowLeft, AlertCircle, Loader2
} from 'lucide-react';
import { getQuote, getQuoteConfig, createOrder, createRFQ } from '../../../lib/database';

interface PartConfig {
  id: string;
  fileName: string;
  material: string;
  quantity: number;
  tolerance: string;
  finish: string;
  leadTimeType: string;
  complexity: string;
  basePrice: number;
}

interface QuoteConfig {
  parts: PartConfig[];
  email: string;
  quoteId: string;
  totalPrice: number;
  maxLeadTime: number;
}

export default function CheckoutPage() {
  const router = useRouter();
  const params = useParams();
  const quoteId = params?.quoteId as string;

  const [config, setConfig] = useState<QuoteConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  
  // Shipping form
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [country, setCountry] = useState('United States');
  
  // Payment (mock)
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [billingZip, setBillingZip] = useState('');

  useEffect(() => {
    async function loadCheckoutData() {
      if (!quoteId) return;
      
      try {
        setLoading(true);
        
        // Load quote and configuration from database
        const quote = await getQuote(quoteId);
        if (!quote) {
          alert('Quote not found');
          router.push('/instant-quote-v2');
          return;
        }
        
        const quoteConfig = await getQuoteConfig(quoteId);
        if (!quoteConfig) {
          alert('Please configure your quote first');
          router.push(`/quote-config/${quoteId}`);
          return;
        }
        
        setConfig({
          parts: quoteConfig.parts,
          email: quote.email,
          quoteId: quoteId,
          totalPrice: quoteConfig.total_price,
          maxLeadTime: quoteConfig.max_lead_time
        });
      } catch (error) {
        console.error('Error loading checkout data:', error);
        alert('Failed to load order details. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    
    loadCheckoutData();
  }, [quoteId, router]);

  const handlePlaceOrder = async () => {
    if (!companyName || !contactName || !phone || !address || !city || !state || !zip) {
      alert('Please fill in all shipping information');
      return;
    }

    if (!cardNumber || !expiryDate || !cvv || !billingZip) {
      alert('Please fill in all payment information');
      return;
    }

    try {
      setIsProcessing(true);

      // Generate order ID
      const orderId = `ORD-2024-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
      
      // Create order in database
      const orderData = {
        id: orderId,
        quote_id: quoteId,
        customer_email: config?.email,
        customer_name: contactName,
        customer_phone: phone,
        customer_company: companyName,
        shipping_address: {
          address,
          city,
          state,
          zip,
          country
        },
        parts: config?.parts,
        total_price: config?.totalPrice || 0,
        status: 'rfq',
        payment_status: 'pending'
      };

      const order = await createOrder(orderData);

      // Extract unique materials from parts
      const uniqueMaterials = config?.parts.map(p => p.material) || [];
      const materialsSet = new Set(uniqueMaterials);
      const materials = Array.from(materialsSet);

      // Create RFQ for suppliers (with privacy protection)
      const rfqData = {
        order_id: order.id,
        display_value: (config?.totalPrice || 0) * 0.5, // Only show 50% to suppliers for privacy
        materials,
        lead_time: config?.maxLeadTime || 7,
        parts: config?.parts.length || 0,
        status: 'open',
        closes_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
      };

      await createRFQ(rfqData);

      setIsProcessing(false);
      setOrderPlaced(true);

      // Redirect to confirmation after 2 seconds
      setTimeout(() => {
        router.push(`/portal/orders/${order.id}`);
      }, 2000);
    } catch (error) {
      console.error('Error placing order:', error);
      alert('Failed to place order. Please try again.');
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading checkout...</p>
        </div>
      </div>
    );
  }

  if (!config) return <div>Loading...</div>;

  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Placed Successfully!</h2>
            <p className="text-gray-600 mb-6">
              Your order has been sent to our manufacturing partners for bidding.
            </p>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const deliveryDate = new Date();
  deliveryDate.setDate(deliveryDate.getDate() + config.maxLeadTime);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
            <p className="text-gray-600">Review and complete your order</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-blue-600" />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {config.parts.map((part, index) => (
                    <div key={part.id} className="flex items-start justify-between border-b pb-4 last:border-0">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{part.fileName}</p>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
                          <p className="text-sm text-gray-600">Material: <span className="font-medium">{part.material}</span></p>
                          <p className="text-sm text-gray-600">Quantity: <span className="font-medium">{part.quantity}</span></p>
                          <p className="text-sm text-gray-600">Tolerance: <span className="font-medium">{part.tolerance}</span></p>
                          <p className="text-sm text-gray-600">Finish: <span className="font-medium">{part.finish}</span></p>
                        </div>
                        <Badge className="mt-2 bg-blue-50 text-blue-700 border-0">
                          {part.leadTimeType} delivery
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Shipping Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  Shipping Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="companyName">Company Name *</Label>
                    <Input
                      id="companyName"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Acme Manufacturing"
                    />
                  </div>
                  <div>
                    <Label htmlFor="contactName">Contact Name *</Label>
                    <Input
                      id="contactName"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      value={config.email}
                      disabled
                      className="bg-gray-50"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone *</Label>
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="address">Street Address *</Label>
                    <Input
                      id="address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="123 Main Street"
                    />
                  </div>
                  <div>
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="San Francisco"
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State *</Label>
                    <Input
                      id="state"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="CA"
                    />
                  </div>
                  <div>
                    <Label htmlFor="zip">ZIP Code *</Label>
                    <Input
                      id="zip"
                      value={zip}
                      onChange={(e) => setZip(e.target.value)}
                      placeholder="94102"
                    />
                  </div>
                  <div>
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      value={country}
                      disabled
                      className="bg-gray-50"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                  Payment Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="cardNumber">Card Number *</Label>
                    <Input
                      id="cardNumber"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      placeholder="1234 5678 9012 3456"
                      maxLength={19}
                    />
                  </div>
                  <div>
                    <Label htmlFor="expiryDate">Expiry Date *</Label>
                    <Input
                      id="expiryDate"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      placeholder="MM/YY"
                      maxLength={5}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cvv">CVV *</Label>
                    <Input
                      id="cvv"
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value)}
                      placeholder="123"
                      maxLength={4}
                      type="password"
                    />
                  </div>
                  <div>
                    <Label htmlFor="billingZip">Billing ZIP *</Label>
                    <Input
                      id="billingZip"
                      value={billingZip}
                      onChange={(e) => setBillingZip(e.target.value)}
                      placeholder="94102"
                    />
                  </div>
                </div>

                <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-yellow-900">
                    <strong>Demo Mode:</strong> This is a mockup. No actual payment will be processed.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary Sidebar */}
          <div className="space-y-6">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Order Total</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Subtotal</span>
                    <span className="font-semibold">${config.totalPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Tax (8.5%)</span>
                    <span className="font-semibold">${(config.totalPrice * 0.085).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Shipping</span>
                    <span className="font-semibold text-green-600">Free</span>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-base font-semibold">Total</span>
                    <span className="text-2xl font-bold text-blue-600">
                      ${(config.totalPrice * 1.085).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="border-t pt-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Estimated Delivery:</span>
                  </div>
                  <p className="font-semibold text-gray-900 pl-6">
                    {deliveryDate.toLocaleDateString('en-US', { 
                      month: 'long', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}
                  </p>
                  <p className="text-xs text-gray-500 pl-6">
                    ({config.maxLeadTime} business days)
                  </p>
                </div>

                <Button 
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  size="lg"
                  onClick={handlePlaceOrder}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-5 h-5 mr-2" />
                      Place Order
                    </>
                  )}
                </Button>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-blue-900">Protected Order</p>
                      <p className="text-xs text-blue-800">
                        Your order will be sent to verified manufacturers for competitive bidding.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
