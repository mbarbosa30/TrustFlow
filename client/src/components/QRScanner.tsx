import { Scanner } from "@yudiel/react-qr-scanner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Camera, AlertCircle } from "lucide-react";

interface QRScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (address: string) => void;
}

export function QRScanner({ open, onOpenChange, onScan }: QRScannerProps) {
  const handleScan = (result: any) => {
    if (result && result.length > 0) {
      const scannedText = result[0].rawValue;
      
      if (scannedText.startsWith('0x') && scannedText.length === 42) {
        onScan(scannedText);
        onOpenChange(false);
      } else if (scannedText.includes('.eth')) {
        onScan(scannedText);
        onOpenChange(false);
      }
    }
  };

  const handleError = (error: any) => {
    console.error('QR Scanner error:', error);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-qr-scanner">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Scan QR Code
          </DialogTitle>
          <DialogDescription>
            Point your camera at a QR code containing a wallet address
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Alert>
            <AlertCircle className="w-4 h-4" />
            <AlertDescription className="text-xs">
              Make sure to allow camera access when prompted
            </AlertDescription>
          </Alert>
          
          {open && (
            <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-black">
              <Scanner
                onScan={handleScan}
                onError={handleError}
                constraints={{
                  facingMode: 'environment'
                }}
                formats={['qr_code']}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
