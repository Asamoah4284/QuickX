import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import PaystackPop from '@paystack/inline-js';
import { FiArrowLeft, FiCheck, FiCheckCircle, FiLock, FiTag } from 'react-icons/fi';
import { api, errorMessage } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useApi } from '../../lib/useApi';
import { FEATURES } from '../../lib/features';
import { durationLabel, formatDate, money, cedis } from '../../lib/format';
import { Alert, Button, Card, Container, Field, Input, PageLoader } from '../../ui/primitives';
import { Reveal } from '../../ui/motion';

const PAYSTACK_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;

function newReference(productKey) {
  const rand = Math.random().toString(36).slice(2, 8);
  return `qx_plan_${productKey.replace(/[^a-z0-9]/gi, '')}_${Date.now()}_${rand}`;
}

function SuccessPanel({ product, entitlements }) {
  const first = FEATURES[product.grants[0]];
  return (
    <Reveal>
      <Card className="mx-auto max-w-xl p-8 text-center sm:p-12">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-up/15 text-up">
          <FiCheckCircle className="h-8 w-8" />
        </div>
        <h1 className="mt-6 text-3xl font-bold text-fg">You&rsquo;re in.</h1>
        <p className="mt-3 text-fg-muted">{product.name} is now active on your account.</p>
        <ul className="mx-auto mt-6 max-w-xs space-y-2 text-left text-sm">
          {entitlements.map((e) => (
            <li key={e.feature} className="flex items-center justify-between gap-4 text-fg-muted">
              <span className="flex items-center gap-2 text-fg">
                <FiCheck className="h-4 w-4 text-up" />
                {FEATURES[e.feature]?.label || e.feature}
              </span>
              <span className="tabular text-xs">until {formatDate(e.endsAt)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button to={first?.path || '/account'}>Open {first?.label || 'my account'}</Button>
          <Button to="/account" variant="secondary">
            My account
          </Button>
        </div>
      </Card>
    </Reveal>
  );
}

export default function ProductCheckout() {
  const { productKey } = useParams();
  const { user, refreshAccess } = useAuth();

  const [quote, setQuote] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');
  const [couponBusy, setCouponBusy] = useState(false);

  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState('');
  /** A reference Paystack accepted but we could not yet confirm, lets the member retry without paying twice. */
  const [pendingReference, setPendingReference] = useState('');
  const [done, setDone] = useState(null);
  const wallet = useApi('/api/wallet');
  const walletBalance = Number(wallet.data?.balance || 0);

  const loadQuote = useCallback(
    async (coupon) => {
      const { data } = await api.get(`/api/products/${productKey}/quote`, { params: coupon ? { coupon } : {} });
      return data;
    },
    [productKey]
  );

  useEffect(() => {
    let cancelled = false;
    setQuote(null);
    setLoadError('');
    loadQuote()
      .then((data) => !cancelled && setQuote(data))
      .catch((err) => !cancelled && setLoadError(errorMessage(err, 'This plan is not available.')));
    return () => {
      cancelled = true;
    };
  }, [loadQuote]);

  const applyCoupon = async (e) => {
    e.preventDefault();
    const code = couponInput.trim();
    if (!code) return;
    setCouponBusy(true);
    setCouponError('');
    try {
      setQuote(await loadQuote(code));
    } catch (err) {
      setCouponError(errorMessage(err, 'That coupon could not be applied.'));
    } finally {
      setCouponBusy(false);
    }
  };

  const removeCoupon = async () => {
    setCouponInput('');
    setCouponError('');
    try {
      setQuote(await loadQuote());
    } catch (err) {
      setLoadError(errorMessage(err));
    }
  };

  const finish = async (data) => {
    await refreshAccess();
    setPendingReference('');
    setDone(data.entitlements || []);
  };

  /** Ask the server to confirm a Paystack reference and switch access on. */
  const confirmPayment = async (reference) => {
    setPaying(true);
    setPayError('');
    try {
      const { data } = await api.post(`/api/products/${productKey}/purchase/paystack`, {
        reference,
        couponCode: quote.couponCode || undefined,
      });
      await finish(data);
    } catch (err) {
      setPendingReference(reference);
      setPayError(
        `${errorMessage(err, 'We could not confirm your payment yet.')} If you were charged, tap "Check payment again". You will not be charged twice. Reference: ${reference}`
      );
    } finally {
      setPaying(false);
    }
  };

  const payFromWallet = async () => {
    setPaying(true);
    setPayError('');
    try {
      const { data } = await api.post(`/api/products/${productKey}/purchase/wallet`, {
        couponCode: quote.couponCode || undefined,
      });
      await finish(data);
    } catch (err) {
      setPayError(errorMessage(err, 'Could not pay from your wallet.'));
      wallet.reload();
    } finally {
      setPaying(false);
    }
  };

  const redeem = async () => {
    setPaying(true);
    setPayError('');
    try {
      const { data } = await api.post(`/api/products/${productKey}/redeem`, { couponCode: quote.couponCode });
      await finish(data);
    } catch (err) {
      setPayError(errorMessage(err));
    } finally {
      setPaying(false);
    }
  };

  const pay = () => {
    setPayError('');
    if (!PAYSTACK_KEY) {
      setPayError('Payments are not set up yet. Please contact support.');
      return;
    }
    const [firstName, ...rest] = String(user?.fullName || '').trim().split(/\s+/);
    try {
      new PaystackPop().newTransaction({
        key: PAYSTACK_KEY,
        email: user.email,
        amount: Math.round(quote.amount * 100),
        currency: 'GHS',
        reference: newReference(productKey),
        channels: ['mobile_money', 'card'],
        ...(firstName ? { firstName } : {}),
        ...(rest.length ? { lastName: rest.join(' ') } : {}),
        ...(user?.phone ? { phone: user.phone } : {}),
        metadata: { item_type: 'product', product_key: productKey, coupon: quote.couponCode || '' },
        onSuccess: (transaction) => confirmPayment(transaction.reference),
        onCancel: () => {},
      });
    } catch (err) {
      setPayError(err?.message || 'Could not open the payment window. Please try again.');
    }
  };

  if (loadError) {
    return (
      <Container className="py-16">
        <Alert className="mx-auto max-w-xl">{loadError}</Alert>
        <div className="mt-6 text-center">
          <Button to="/pricing" variant="secondary">
            See all plans
          </Button>
        </div>
      </Container>
    );
  }
  if (!quote) return <PageLoader label="Loading plan" />;

  const { product } = quote;
  if (done) {
    return (
      <Container className="py-16">
        <SuccessPanel product={product} entitlements={done} />
      </Container>
    );
  }

  const free = quote.amount < 0.01;

  return (
    <>
      <Helmet>
        <title>{`Checkout: ${product.name} | QuickX`}</title>
      </Helmet>
      <Container className="py-10 sm:py-14">
        <Link to="/pricing" className="inline-flex items-center gap-2 text-sm text-fg-muted transition hover:text-fg">
          <FiArrowLeft className="h-4 w-4" />
          All plans
        </Link>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <Reveal>
            <Card className="p-7 sm:p-9">
              <p className="text-sm font-semibold text-brand-400">You&rsquo;re getting</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-fg">{product.name}</h1>
              <p className="mt-2 text-fg-muted">{product.tagline}</p>
              <ul className="mt-6 space-y-3 text-sm">
                {product.highlights.map((item) => (
                  <li key={item} className="flex gap-3 text-fg-muted">
                    <FiCheck className="mt-0.5 h-4 w-4 shrink-0 text-up" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-6 rounded-xl border border-line bg-ink-900 px-4 py-3 text-sm text-fg-muted">
                Access lasts <strong className="text-fg">{durationLabel(product.durationDays)}</strong>. If you already
                have time left, this is added on top.
              </p>
            </Card>
          </Reveal>

          <Reveal delay={0.08}>
            <Card className="p-7 sm:p-9">
              <h2 className="text-lg font-semibold text-fg">Order summary</h2>

              <dl className="mt-5 space-y-3 text-sm">
                <div className="flex justify-between text-fg-muted">
                  <dt>
                    {product.name} · {durationLabel(product.durationDays)}
                  </dt>
                  <dd className="tabular">{money(quote.listPrice)}</dd>
                </div>
                {quote.discountPercent > 0 ? (
                  <div className="flex justify-between text-up">
                    <dt>
                      Coupon {quote.couponCode} (−{quote.discountPercent}%)
                    </dt>
                    <dd className="tabular">−{money(quote.listPrice - quote.amount)}</dd>
                  </div>
                ) : null}
                <div className="flex items-baseline justify-between border-t border-line pt-4">
                  <dt className="font-semibold text-fg">Total</dt>
                  <dd className="tabular text-3xl font-bold text-fg">{cedis(quote.amount)}</dd>
                </div>
              </dl>

              {quote.couponCode ? (
                <button
                  type="button"
                  onClick={removeCoupon}
                  className="mt-4 text-sm text-fg-muted underline-offset-4 hover:text-fg hover:underline"
                >
                  Remove coupon
                </button>
              ) : (
                <form onSubmit={applyCoupon} className="mt-5">
                  <Field label="Coupon code" htmlFor="coupon" error={couponError}>
                    <div className="flex gap-2">
                      <Input
                        id="coupon"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        placeholder="Optional"
                        autoComplete="off"
                      />
                      <Button type="submit" variant="secondary" loading={couponBusy} disabled={!couponInput.trim()}>
                        <FiTag className="h-4 w-4" />
                        Apply
                      </Button>
                    </div>
                  </Field>
                </form>
              )}

              {payError ? <Alert className="mt-5">{payError}</Alert> : null}

              <div className="mt-6 space-y-3">
                {pendingReference ? (
                  <Button className="w-full" size="lg" loading={paying} onClick={() => confirmPayment(pendingReference)}>
                    Check payment again
                  </Button>
                ) : free ? (
                  <Button className="w-full" size="lg" loading={paying} onClick={redeem}>
                    Activate for free
                  </Button>
                ) : (
                  <>
                    <Button className="w-full" size="lg" loading={paying} onClick={pay}>
                      Pay {cedis(quote.amount)}
                    </Button>
                    {walletBalance >= quote.amount ? (
                      <Button className="w-full" variant="secondary" disabled={paying} onClick={payFromWallet}>
                        Pay from wallet · <span className="tabular">{cedis(walletBalance)}</span> available
                      </Button>
                    ) : null}
                  </>
                )}
                <p className="flex items-center justify-center gap-2 text-xs text-fg-subtle">
                  <FiLock className="h-3.5 w-3.5" />
                  Mobile money or card, processed securely by Paystack
                </p>
              </div>
            </Card>
          </Reveal>
        </div>
      </Container>
    </>
  );
}
