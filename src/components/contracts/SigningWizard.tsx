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
          <div className="mt-4">
            <TypedSignature
              signerName={signerName}
              label={page.signatureLabel}
              existingSignature={signatures[page.pageNum]}
              onSign={(sig) => setSignatures(prev => ({ ...prev, [page.pageNum]: sig }))}
              onClear={() => setSignatures(prev => {
                const next = { ...prev };
                delete next[page.pageNum];
                return next;
              })}
            />
          </div>
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
