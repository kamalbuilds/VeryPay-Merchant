import React from 'react';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { 
  QrCode, 
  Scan, 
  DollarSign, 
  ArrowRight, 
  CheckCircle, 
  AlertCircle,
  Copy,
  Share2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QRCodeGenerator } from '@/components/qr/QRCodeGenerator';
import { QRCodeScanner } from '@/components/qr/QRCodeScanner';
import { WalletConnect } from '@/components/web3/WalletConnect';
import { useToast } from '@/hooks/use-toast';
import { useAppStore } from '@/stores/useAppStore';
import { QRCodeData, PaymentForm } from '@/types';

export default function Payment() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { merchant } = useAppStore();
  const [activeTab, setActiveTab] = useState('create');
  const [paymentForm, setPaymentForm] = useState<PaymentForm>({
    amount: '',
    token: 'VERY',
    description: '',
  });
  const [generatedQR, setGeneratedQR] = useState<QRCodeData | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'pending' | 'success' | 'failed'>('idle');

  const supportedTokens = [
    { value: 'VERY', label: 'VERY Token', icon: '🚀' },
    { value: 'ETH', label: 'Ethereum', icon: '⟠' },
    { value: 'USDC', label: 'USD Coin', icon: '💵' },
    { value: 'USDT', label: 'Tether', icon: '₮' },
  ];

  const handleGenerateQR = () => {
    if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid payment amount',
        variant: 'destructive',
      });
      return;
    }

    const qrData: QRCodeData = {
      type: 'payment',
      version: '1.0',
      merchant: merchant?.id || 'demo-merchant',
      amount: paymentForm.amount,
      token: paymentForm.token,
      description: paymentForm.description,
      timestamp: Date.now(),
    };

    setGeneratedQR(qrData);
    toast({
      title: 'QR Code Generated',
      description: 'Payment QR code is ready for scanning',
      variant: 'success',
    });
  };

  const handleScanResult = (qrData: QRCodeData) => {
    console.log('Scanned QR data:', qrData);
    setPaymentStatus('pending');
    
    // Simulate payment processing
    setTimeout(() => {
      setPaymentStatus('success');
      toast({
        title: 'Payment Successful',
        description: `Received ${qrData.amount} ${qrData.token}`,
        variant: 'success',
      });
    }, 2000);
  };

  const handleScanError = (error: string) => {
    toast({
      title: 'Scan Error',
      description: error,
      variant: 'destructive',
    });
  };

  const calculateUSDValue = (amount: string, token: string) => {
    // Mock exchange rates - in real app, fetch from API
    const rates: Record<string, number> = {
      VERY: 0.15,
      ETH: 2500,
      USDC: 1,
      USDT: 1,
    };
    const numAmount = parseFloat(amount) || 0;
    return numAmount * (rates[token] || 0);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Payment Center</h1>
        <p className="text-muted-foreground">
          Create payment QR codes or scan customer payments
        </p>
      </div>

      {/* Wallet Connection */}
      <div className="flex justify-center">
        <WalletConnect variant="full" className="max-w-md" />
      </div>

      {/* Main Interface */}
      <Card>
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="create" className="flex items-center gap-2">
                <QrCode className="w-4 h-4" />
                Generate QR
              </TabsTrigger>
              <TabsTrigger value="scan" className="flex items-center gap-2">
                <Scan className="w-4 h-4" />
                Scan Payment
              </TabsTrigger>
            </TabsList>

            {/* Generate QR Code Tab */}
            <TabsContent value="create" className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Payment Form */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Create Payment Request</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="amount">Amount</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="amount"
                          type="number"
                          placeholder="0.00"
                          value={paymentForm.amount}
                          onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                          className="pl-10"
                        />
                      </div>
                      {paymentForm.amount && (
                        <p className="text-sm text-muted-foreground mt-1">
                          ≈ {formatCurrency(calculateUSDValue(paymentForm.amount, paymentForm.token))}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="token">Token</Label>
                      <Select 
                        value={paymentForm.token} 
                        onValueChange={(value) => setPaymentForm(prev => ({ ...prev, token: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select token" />
                        </SelectTrigger>
                        <SelectContent>
                          {supportedTokens.map((token) => (
                            <SelectItem key={token.value} value={token.value}>
                              <div className="flex items-center gap-2">
                                <span>{token.icon}</span>
                                <span>{token.label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="description">Description (Optional)</Label>
                      <Input
                        id="description"
                        placeholder="Coffee, merchandise, etc."
                        value={paymentForm.description}
                        onChange={(e) => setPaymentForm(prev => ({ ...prev, description: e.target.value }))}
                      />
                    </div>

                    <Button 
                      onClick={handleGenerateQR} 
                      className="w-full"
                      variant="very"
                    >
                      Generate QR Code
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>

                {/* QR Code Display */}
                <div className="flex items-center justify-center">
                  {generatedQR ? (
                    <QRCodeGenerator
                      data={generatedQR}
                      title="Payment QR Code"
                      description="Scan with VeryPay app to pay"
                      size={300}
                    />
                  ) : (
                    <div className="w-80 h-80 border-2 border-dashed border-muted-foreground/25 rounded-lg flex items-center justify-center">
                      <div className="text-center text-muted-foreground">
                        <QrCode className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <p>QR code will appear here</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Scan QR Code Tab */}
            <TabsContent value="scan" className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Scanner */}
                <QRCodeScanner
                  onScan={handleScanResult}
                  onError={handleScanError}
                  title="Scan Customer Payment"
                  description="Point your camera at the customer's QR code"
                />

                {/* Payment Status */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Payment Status</h3>
                  
                  {paymentStatus === 'idle' && (
                    <Card>
                      <CardContent className="p-6 text-center">
                        <Scan className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-muted-foreground">
                          Ready to scan payment QR code
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {paymentStatus === 'pending' && (
                    <Card>
                      <CardContent className="p-6 text-center">
                        <div className="animate-spin w-8 h-8 border-4 border-very-500 border-t-transparent rounded-full mx-auto mb-4" />
                        <h4 className="font-semibold mb-2">Processing Payment</h4>
                        <p className="text-sm text-muted-foreground">
                          Confirming transaction on blockchain...
                        </p>
                        <Badge variant="warning" className="mt-4">Pending</Badge>
                      </CardContent>
                    </Card>
                  )}

                  {paymentStatus === 'success' && (
                    <Card className="border-green-200">
                      <CardContent className="p-6 text-center">
                        <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                        <h4 className="font-semibold mb-2 text-green-700">Payment Successful!</h4>
                        <p className="text-sm text-muted-foreground mb-4">
                          Transaction confirmed on blockchain
                        </p>
                        <Badge variant="success">Completed</Badge>
                        <div className="mt-4 pt-4 border-t">
                          <Button variant="outline" size="sm" className="mr-2">
                            <Copy className="w-4 h-4 mr-1" />
                            Receipt
                          </Button>
                          <Button variant="outline" size="sm">
                            <Share2 className="w-4 h-4 mr-1" />
                            Share
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {paymentStatus === 'failed' && (
                    <Card className="border-red-200">
                      <CardContent className="p-6 text-center">
                        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
                        <h4 className="font-semibold mb-2 text-red-700">Payment Failed</h4>
                        <p className="text-sm text-muted-foreground mb-4">
                          Transaction was rejected or failed to process
                        </p>
                        <Badge variant="destructive">Failed</Badge>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-4"
                          onClick={() => setPaymentStatus('idle')}
                        >
                          Try Again
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Today's Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$1,234.56</div>
            <p className="text-sm text-muted-foreground">23 transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Average Transaction</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$53.67</div>
            <p className="text-sm text-muted-foreground">+8% from yesterday</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">98.5%</div>
            <p className="text-sm text-muted-foreground">Excellent performance</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}