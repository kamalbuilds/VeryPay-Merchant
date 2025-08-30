import React from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, LogOut, Copy, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';

interface WalletConnectProps {
  className?: string;
  variant?: 'compact' | 'full';
}

export function WalletConnect({ className, variant = 'compact' }: WalletConnectProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const [copied, setCopied] = React.useState(false);

  const handleCopyAddress = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      toast({
        title: t('common.copied'),
        description: t('wallet.address'),
        variant: 'success',
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (variant === 'compact') {
    if (isConnected) {
      return (
        <div className={`flex items-center gap-2 ${className}`}>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyAddress}
            className="font-mono"
          >
            {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
            {address && formatAddress(address)}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => disconnect()}
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      );
    }

    return (
      <Button
        variant="very"
        size="sm"
        onClick={() => connectors[0] && connect({ connector: connectors[0] })}
        disabled={isPending}
        className={className}
      >
        <Wallet className="w-4 h-4 mr-2" />
        {isPending ? t('wallet.connecting') : t('wallet.connect')}
      </Button>
    );
  }

  if (isConnected) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-green-500" />
            {t('wallet.connected')}
          </CardTitle>
          <CardDescription>{t('wallet.address')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <span className="font-mono text-sm">{address && formatAddress(address)}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyAddress}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
          <Button
            variant="outline"
            onClick={() => disconnect()}
            className="w-full"
          >
            <LogOut className="w-4 h-4 mr-2" />
            {t('wallet.disconnect')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{t('wallet.connect')}</CardTitle>
        <CardDescription>
          Choose a wallet to connect to VeryPay
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {connectors.map((connector) => (
          <Button
            key={connector.uid}
            variant="outline"
            onClick={() => connect({ connector })}
            disabled={isPending}
            className="w-full justify-start"
          >
            <Wallet className="w-4 h-4 mr-2" />
            {connector.name}
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}