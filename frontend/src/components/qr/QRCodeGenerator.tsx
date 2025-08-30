import React from 'react';
import QRCode from 'qrcode';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Share2, Copy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import { QRCodeData } from '@/types';

interface QRCodeGeneratorProps {
  data: QRCodeData;
  title?: string;
  description?: string;
  size?: number;
  className?: string;
  showActions?: boolean;
}

export function QRCodeGenerator({
  data,
  title,
  description,
  size = 256,
  className,
  showActions = true,
}: QRCodeGeneratorProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [qrDataUrl, setQrDataUrl] = React.useState<string>('');
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    generateQR();
  }, [data, size]);

  const generateQR = async () => {
    try {
      const qrString = JSON.stringify(data);
      const dataUrl = await QRCode.toDataURL(qrString, {
        width: size,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
        errorCorrectionLevel: 'M',
      });
      setQrDataUrl(dataUrl);

      // Also generate to canvas for download
      if (canvasRef.current) {
        await QRCode.toCanvas(canvasRef.current, qrString, {
          width: size,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
        });
      }
    } catch (error) {
      console.error('Failed to generate QR code:', error);
      toast({
        title: t('errors.general'),
        description: 'Failed to generate QR code',
        variant: 'destructive',
      });
    }
  };

  const handleDownload = () => {
    if (canvasRef.current) {
      const link = document.createElement('a');
      link.download = `verypay-qr-${Date.now()}.png`;
      link.href = canvasRef.current.toDataURL();
      link.click();
    }
  };

  const handleCopy = async () => {
    try {
      if (canvasRef.current) {
        const blob = await new Promise<Blob>((resolve) => {
          canvasRef.current!.toBlob(resolve as any, 'image/png');
        });
        
        await navigator.clipboard.write([
          new ClipboardItem({
            'image/png': blob,
          }),
        ]);
        
        toast({
          title: t('common.copied'),
          description: 'QR code copied to clipboard',
          variant: 'success',
        });
      }
    } catch (error) {
      // Fallback to copying the data string
      await navigator.clipboard.writeText(JSON.stringify(data));
      toast({
        title: t('common.copied'),
        description: 'QR code data copied to clipboard',
        variant: 'success',
      });
    }
  };

  const handleShare = async () => {
    if ('share' in navigator && canvasRef.current) {
      try {
        const blob = await new Promise<Blob>((resolve) => {
          canvasRef.current!.toBlob(resolve as any, 'image/png');
        });
        
        const file = new File([blob], 'verypay-qr.png', { type: 'image/png' });
        
        await navigator.share({
          title: 'VeryPay QR Code',
          text: 'Scan this QR code to make a payment',
          files: [file],
        });
      } catch (error) {
        // Fallback to copying
        handleCopy();
      }
    } else {
      handleCopy();
    }
  };

  return (
    <Card className={className}>
      {(title || description) && (
        <CardHeader className="text-center">
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent className="flex flex-col items-center space-y-4">
        <div className="relative">
          {qrDataUrl && (
            <img
              src={qrDataUrl}
              alt="QR Code"
              className="rounded-lg border"
              style={{ width: size, height: size }}
            />
          )}
          <canvas
            ref={canvasRef}
            className="hidden"
            width={size}
            height={size}
          />
        </div>
        
        {showActions && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
            >
              <Download className="w-4 h-4 mr-1" />
              {t('common.download', 'Download')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
            >
              <Copy className="w-4 h-4 mr-1" />
              {t('common.copy')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
            >
              <Share2 className="w-4 h-4 mr-1" />
              {t('common.share', 'Share')}
            </Button>
          </div>
        )}
        
        <div className="text-xs text-muted-foreground text-center max-w-xs">
          <p>Scan this QR code with VeryPay app to complete the transaction</p>
          <p className="mt-1 font-mono text-xs">{data.type.toUpperCase()}</p>
        </div>
      </CardContent>
    </Card>
  );
}