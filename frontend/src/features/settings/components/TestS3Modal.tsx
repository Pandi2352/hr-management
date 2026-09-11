import React from 'react';
import { HardDrive, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button, Modal } from '../../../components/ui';
import type { TestS3Result } from '../api/settings.api';

interface TestS3ModalProps {
  isOpen: boolean;
  onClose: () => void;
  isTesting: boolean;
  onRunTest: () => void;
  s3Bucket: string;
  testResult: {
    success: boolean;
    message: string;
    details?: TestS3Result;
    timestamp?: string;
  } | null;
}

export const TestS3Modal: React.FC<TestS3ModalProps> = ({
  isOpen,
  onClose,
  isTesting,
  onRunTest,
  s3Bucket,
  testResult,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Test S3 Cloud Storage Connectivity"
    >
      <div className="space-y-4 pt-1">
        <p className="text-xs text-muted-foreground">
          Verify AWS SDK credential handshake and bucket read/write permissions
        </p>
        <div className="rounded-md border border-hairline bg-surface-hover/30 p-3.5 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Target Storage Bucket
            </span>
            <p className="text-xs font-mono font-semibold text-foreground">
              {s3Bucket || 'No bucket configured'}
            </p>
          </div>
          <Button
            type="button"
            onClick={onRunTest}
            isLoading={isTesting}
            size="sm"
            className="flex items-center gap-1.5 rounded-md"
          >
            <HardDrive className="h-3.5 w-3.5" />
            Ping Bucket
          </Button>
        </div>

        {testResult && (
          <div
            className={`p-4 rounded-md border text-xs leading-relaxed ${
              testResult.success
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {testResult.success ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
              )}
              <div className="space-y-1 min-w-0">
                <p className="font-bold">{testResult.message}</p>
                {testResult.timestamp && (
                  <p className="text-[10px] opacity-75 font-mono">
                    Time: {new Date(testResult.timestamp).toLocaleString()}
                  </p>
                )}
                {testResult.details && (
                  <pre className="mt-2 p-2 rounded bg-surface/80 border border-hairline text-[10px] font-mono overflow-x-auto text-foreground">
                    {JSON.stringify(testResult.details, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-hairline">
          <Button variant="outline" size="sm" onClick={onClose} className="rounded-md">
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
