import React from 'react';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, X, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import { QRCodeData } from '@/types';

interface QRCodeScannerProps {
  onScan: (data: QRCodeData) => void;
  onError?: (error: string) => void;
  onClose?: () => void;
  className?: string;
  title?: string;
  description?: string;
}

export function QRCodeScanner({
  onScan,
  onError,
  onClose,
  className,
  title,
  description,
}: QRCodeScannerProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isScanning, setIsScanning] = React.useState(false);
  const [scanner, setScanner] = React.useState<Html5QrcodeScanner | null>(null);
  const scannerRef = React.useRef<HTMLDivElement>(null);

  const startScanning = React.useCallback(() => {
    if (!scannerRef.current || scanner) return;

    const newScanner = new Html5QrcodeScanner(
      'qr-scanner',
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        supportedScanTypes: [Html5QrcodeSupportedFormats.QR_CODE],
        showTorchButtonIfSupported: true,
        showZoomSliderIfSupported: true,
      },
      false
    );

    newScanner.render(
      (decodedText) => {
        handleScanSuccess(decodedText);
        stopScanning();
      },
      (errorMessage) => {
        // Ignore frequent scanning errors
        if (!errorMessage.includes('No QR code found')) {
          console.warn('QR scan error:', errorMessage);
        }
      }
    );

    setScanner(newScanner);
    setIsScanning(true);
  }, [scanner]);

  const stopScanning = React.useCallback(() => {
    if (scanner) {
      scanner.clear().catch(console.error);
      setScanner(null);
      setIsScanning(false);
    }
  }, [scanner]);

  const handleScanSuccess = (decodedText: string) => {
    try {
      // Try to parse as JSON (VeryPay QR code format)
      const qrData: QRCodeData = JSON.parse(decodedText);
      
      // Validate QR code structure
      if (!qrData.type || !qrData.version || !qrData.timestamp) {
        throw new Error('Invalid VeryPay QR code format');
      }

      // Check if QR code is not too old (1 hour max)
      const ageInMs = Date.now() - qrData.timestamp;
      const maxAgeMs = 60 * 60 * 1000; // 1 hour
      
      if (ageInMs > maxAgeMs) {
        throw new Error('QR code has expired');
      }

      onScan(qrData);
      
      toast({
        title: t('payment.success'),
        description: 'QR code scanned successfully',
        variant: 'success',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Invalid QR code';
      console.error('QR scan parsing error:', error);
      
      if (onError) {
        onError(errorMessage);
      }
      
      toast({
        title: t('errors.general'),
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  React.useEffect(() => {
    return () => {
      stopScanning();
    };
  }, [stopScanning]);

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              {title || t('payment.scanQR')}
            </CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isScanning ? (
          <div className="text-center space-y-4">
            <div className="w-64 h-64 mx-auto bg-muted rounded-lg flex items-center justify-center">
              <Camera className="w-16 h-16 text-muted-foreground" />
            </div>
            <Button onClick={startScanning} variant="very">
              <Camera className="w-4 h-4 mr-2" />
              Start Scanning
            </Button>
            <p className="text-sm text-muted-foreground">
              Position the QR code within the camera viewfinder
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div
              id="qr-scanner"
              ref={scannerRef}
              className="w-full"
            />
            <Button
              onClick={stopScanning}
              variant="outline"
              className="w-full"
            >
              <X className="w-4 h-4 mr-2" />
              Stop Scanning
            </Button>
          </div>
        )}
        
        <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <AlertTriangle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-blue-800">
            <p className="font-medium">Tips for better scanning:</p>
            <ul className="mt-1 space-y-1">
              <li>• Hold your device steady</li>
              <li>• Ensure good lighting</li>
              <li>• Keep the QR code clean and unobstructed</li>
              <li>• Position the code within the viewfinder</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}