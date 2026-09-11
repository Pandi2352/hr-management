import React from 'react';
import { Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button, Input, Modal } from '../../../components/ui';
import type { TestSmtpResult } from '../api/settings.api';

interface TestSmtpModalProps {
  isOpen: boolean;
  onClose: () => void;
  testRecipient: string;
  setTestRecipient: (val: string) => void;
  isTesting: boolean;
  onRunTest: () => void;
  testResult: {
    success: boolean;
    message: string;
    diagnostic?: TestSmtpResult;
    timestamp?: string;
  } | null;
}

export const TestSmtpModal: React.FC<TestSmtpModalProps> = ({
  isOpen,
  onClose,
  testRecipient,
  setTestRecipient,
  isTesting,
  onRunTest,
  testResult,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Test Outbound Mail Gateway"
    >
      <div className="space-y-4 pt-1">
        <p className="text-xs text-muted-foreground">
          Send a verification dispatch to test SMTP credentials and TLS negotiation
        </p>
        <div>
          <label className="block text-[11px] font-medium tracking-wide uppercase text-muted-foreground mb-1">
            Recipient Email Address
          </label>
          <div className="flex gap-2">
            <Input
              type="email"
              value={testRecipient}
              onChange={(e) => setTestRecipient(e.target.value)}
              placeholder="admin@yourcompany.com"
              className="rounded-md flex-1 text-xs"
            />
            <Button
              type="button"
              onClick={onRunTest}
              isLoading={isTesting}
              size="sm"
              className="flex items-center gap-1.5 shrink-0 rounded-md"
            >
              <Send className="h-3.5 w-3.5" />
              Dispatch Test
            </Button>
          </div>
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
                {testResult.diagnostic && (
                  <pre className="mt-2 p-2 rounded bg-surface/80 border border-hairline text-[10px] font-mono overflow-x-auto text-foreground">
                    {JSON.stringify(testResult.diagnostic, null, 2)}
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
