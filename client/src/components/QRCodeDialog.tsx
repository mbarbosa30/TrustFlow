import { QRCodeSVG } from "qrcode.react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { useState } from "react";

interface QRCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  address: string;
}

export function QRCodeDialog({ open, onOpenChange, address }: QRCodeDialogProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-qr-code">
        <DialogHeader>
          <DialogTitle>Your Wallet Address</DialogTitle>
          <DialogDescription>
            Share this QR code for others to vouch for you
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-6 py-4">
          <div className="bg-white p-4 rounded-lg" data-testid="qr-code-container">
            <QRCodeSVG
              value={address}
              size={200}
              level="H"
              includeMargin={false}
            />
          </div>
          <div className="w-full space-y-2">
            <p className="text-xs text-muted-foreground text-center">Wallet Address</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-muted p-2 rounded font-mono break-all" data-testid="text-wallet-address">
                {address}
              </code>
              <Button
                size="icon"
                variant="outline"
                onClick={handleCopy}
                data-testid="button-copy-address"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
