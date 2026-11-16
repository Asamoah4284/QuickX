import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FiCheckCircle } from 'react-icons/fi';
import { Button, Container } from '../../ui/primitives';

/**
 * Paystack sends app payments here when they finish. The app is waiting for the
 * quickxlearn:// link, so we hand control back to it straight away.
 */
export default function PaymentDone() {
  const [params] = useSearchParams();
  const reference = params.get('reference') || params.get('trxref') || '';
  const appLink = useMemo(
    () => `quickxlearn://payment-done${reference ? `?reference=${encodeURIComponent(reference)}` : ''}`,
    [reference]
  );

  useEffect(() => {
    window.location.href = appLink;
  }, [appLink]);

  return (
    <>
      <Helmet>
        <title>Payment finished | QuickX</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <Container className="flex min-h-[60dvh] flex-col items-center justify-center py-16 text-center">
        <FiCheckCircle className="h-12 w-12 text-up" />
        <h1 className="mt-5 text-2xl font-semibold text-fg">Payment finished</h1>
        <p className="mt-2 max-w-sm text-fg-muted">Go back to the QuickX app to see your purchase.</p>
        <Button href={appLink} className="mt-6">
          Open the QuickX app
        </Button>
        {reference ? <p className="tabular mt-6 text-xs text-fg-subtle">Reference: {reference}</p> : null}
      </Container>
    </>
  );
}
