import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowRight, ArrowLeft, PenTool } from 'lucide-react';
import TypedSignature from './TypedSignature';

export interface SignablePage {
  pageNum: number;
  title: string;
  content: React.ReactNode;
  requiresSignature: boolean;
  signatureLabel: string;
}

interface SigningWizardProps {
  pages: SignablePage[];
  signerName: string;
  onComplete: (signatures: Record<number, string>) => void;
  onBack: () => void;
}

export default function SigningWizard({ pages, signerName, onComplete, onBack }: SigningWizardProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [signatures, setSignatures] = useState<Record<number, string>>({});

  const page = pages[currentPage];
  const progress = ((currentPage + 1) / pages.length) * 100;
  const totalSignatures = pages.filter(p => p.requiresSignature).length;
  const completedSignatures = Object.keys(signatures).length;

  const canProceed = !page.requiresSignature || signatures[page.pageNum];
  const isLastPage = currentPage === pages.length - 1;

  const handleNext = () => {
    if (isLastPage) {
      onComplete(signatures);
    } else {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentPage === 0) {
      onBack();
    } else {
      setCurrentPage(prev => prev - 1);
    }
  };

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <Card className="border-primary/20">
        <CardContent className="py-3 px-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                Page {currentPage + 1} of {pages.length}
              </Badge>
              <span className="text-sm font-medium text-muted-foreground">{page.title}</span>
            </div>
            <div className="flex items-center gap-2">
              <PenTool className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs text-muted-foreground">{completedSignatures}/{totalSignatures} signatures</span>
            </div>
          </div>
          <Progress value={progress} className="h-2" />
        </CardContent>
      </Card>

      {/* Contract page content */}
      <div className="relative">
        {page.content}

        {/* Signature area for this page */}
        {page.requiresSignature && (
          <Card className={`mt-4 border-2 ${signatures[page.pageNum] ? 'border-green-500/50 bg-green-500/5' : 'border-yellow-500/50 bg-yellow-500/5 animate-pulse'}`}>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                {signatures[page.pageNum] ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-green-600">✅ Signed — {page.signatureLabel}</span>
                  </>
                ) : (
                  <>
                    <PenTool className="h-4 w-4 text-yellow-600" />
                    <span className="text-yellow-700">✍️ Sign Here — {page.signatureLabel}</span>
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="py-3">
              {signatures[page.pageNum] ? (
                <div className="flex items-center justify-between">
                  <div className="bg-white rounded-lg p-2 inline-block">
                    <img src={signatures[page.pageNum]} alt="Signature" className="h-16" />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSignatures(prev => {
                      const next = { ...prev };
                      delete next[page.pageNum];
                      return next;
                    })}
                  >
                    <Eraser className="h-4 w-4 mr-1" /> Re-sign
                  </Button>
                </div>
              ) : (
                <>
                  <div className="mb-2">
                    <p className="text-xs text-muted-foreground mb-1">Signing as: <strong>{signerName}</strong></p>
                  </div>
                  <div className="border-2 border-dashed border-yellow-400 rounded-lg bg-white overflow-hidden touch-none">
                    <SignatureCanvas
                      ref={sigRef}
                      canvasProps={{ className: 'w-full h-[150px]', style: { width: '100%', height: '150px' } }}
                      penColor="#000000"
                      backgroundColor="#ffffff"
                    />
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Button variant="ghost" size="sm" onClick={handleClear}>
                      <Eraser className="h-4 w-4 mr-1" /> Clear
                    </Button>
                    <Button size="sm" onClick={handleSign} className="bg-yellow-600 hover:bg-yellow-700 text-white">
                      <PenTool className="h-4 w-4 mr-1" /> Confirm Signature
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Navigation */}
      <div className="flex gap-3 sticky bottom-4">
        <Button variant="outline" className="flex-1" onClick={handlePrev}>
          <ArrowLeft className="h-4 w-4 mr-1" /> {currentPage === 0 ? 'Back to Info' : 'Previous'}
        </Button>
        <Button className="flex-1" disabled={!canProceed} onClick={handleNext}>
          {isLastPage ? (
            <>✅ Review & Submit</>
          ) : (
            <>Next Page <ArrowRight className="h-4 w-4 ml-1" /></>
          )}
        </Button>
      </div>
    </div>
  );
}
