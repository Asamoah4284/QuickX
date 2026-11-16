import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FiArrowRight, FiPieChart, FiShield, FiUsers } from 'react-icons/fi';
import { useApi } from '../../lib/useApi';
import { cedis, daysLeft } from '../../lib/format';
import { Alert, Badge, Card, Container, EmptyState, PageHeader, Skeleton } from '../../ui/primitives';
import { Tabs } from '../../ui/overlays';
import { Reveal, Stagger, StaggerItem } from '../../ui/motion';
import { FundingBar, OUTCOME, PIE_STATUS, RISK_TEXT, percentFunded } from './shared';

const STEPS = [
  { title: 'Pick a Pie', body: 'Each Pie is one trading plan: the pair, the target return and the most it can lose.' },
  { title: 'Take a slice', body: 'Put in money from your QuickX wallet. Your share of the result matches your share of the Pie.' },
  { title: 'Get paid out', body: 'When the trade closes, your slice plus profit (or what is left after a loss) goes back to your wallet.' },
];

function PieCard({ pie }) {
  const status = PIE_STATUS[pie.status] || PIE_STATUS.funding;
  const outcome = pie.outcome ? OUTCOME[pie.outcome] : null;
  const left = daysLeft(pie.fundingDeadline);

  return (
    <Link to={`/pie/${pie._id}`} className="group block h-full">
      <Card interactive className="flex h-full flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="tabular text-xs font-semibold uppercase tracking-wider text-fg-subtle">{pie.pair}</p>
            <h3 className="mt-1 line-clamp-2 font-semibold text-fg">{pie.title}</h3>
          </div>
          <Badge tone={outcome ? outcome.tone : status.tone}>
            {outcome ? `${outcome.label} ${pie.finalPnlPercent > 0 ? '+' : ''}${pie.finalPnlPercent}%` : status.label}
          </Badge>
        </div>

        <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-ink-900 px-2 py-2">
            <dt className="text-[11px] text-fg-subtle">Aiming for</dt>
            <dd className="tabular text-sm font-semibold text-up">+{pie.targetRoiPercent}%</dd>
          </div>
          <div className="rounded-lg bg-ink-900 px-2 py-2">
            <dt className="text-[11px] text-fg-subtle">Most it can lose</dt>
            <dd className="tabular text-sm font-semibold text-down">-{pie.maxLossPercent}%</dd>
          </div>
          <div className="rounded-lg bg-ink-900 px-2 py-2">
            <dt className="text-[11px] text-fg-subtle">Risk</dt>
            <dd className="text-sm font-semibold text-fg">{pie.riskLevel}</dd>
          </div>
        </dl>

        <div className="mt-auto pt-5">
          <div className="mb-2 flex items-baseline justify-between text-sm">
            <span className="tabular font-semibold text-fg">{cedis(pie.raisedAmount)}</span>
            <span className="tabular text-xs text-fg-subtle">
              {percentFunded(pie)}% of {cedis(pie.targetAmount)}
            </span>
          </div>
          <FundingBar pie={pie} />
          <div className="mt-3 flex items-center justify-between text-xs text-fg-subtle">
            <span className="inline-flex items-center gap-1">
              <FiUsers className="h-3.5 w-3.5" /> {pie.participantCount || 0} in
            </span>
            {pie.status === 'funding' && pie.fundingDeadline ? (
              <span>{left > 0 ? `${left} day${left === 1 ? '' : 's'} left to join` : 'Closing today'}</span>
            ) : (
              <span className="inline-flex items-center gap-1 text-brand-300 opacity-0 transition group-hover:opacity-100">
                View <FiArrowRight className="h-3.5 w-3.5" />
              </span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}

export default function PieList() {
  const [tab, setTab] = useState('funding');
  const { data, loading, error } = useApi('/api/ptrading', { params: { status: tab === 'all' ? 'all' : tab } });
  const stats = data?.stats;
  const pies = data?.pies || [];

  return (
    <>
      <Helmet>
        <title>Pie trading | QuickX</title>
      </Helmet>
      <Container className="space-y-10 py-10 sm:py-14">
        <PageHeader
          eyebrow="Pie trading"
          title="Trade together with Maxwell"
          description="Join a shared trade with a small amount. Maxwell runs the trade, and everyone shares the result in proportion to what they put in."
        />

        <Stagger className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <StaggerItem key={step.title}>
              <Card className="h-full p-5">
                <span className="tabular flex h-8 w-8 items-center justify-center rounded-full bg-brand-500/15 text-sm font-bold text-brand-300">
                  {i + 1}
                </span>
                <h3 className="mt-3 font-semibold text-fg">{step.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-fg-muted">{step.body}</p>
              </Card>
            </StaggerItem>
          ))}
        </Stagger>

        <Reveal>
          <Alert tone="warn" className="flex gap-3">
            <FiShield className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{RISK_TEXT}</span>
          </Alert>
        </Reveal>

        {stats && stats.settledCount > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              ['Pies finished', stats.settledCount],
              ['Win rate', stats.winRate == null ? 'None yet' : `${stats.winRate}%`],
              ['Money put in', cedis(stats.totalCapitalRaised)],
              ['Paid back out', cedis(stats.totalDistributed)],
            ].map(([label, value]) => (
              <Card key={label} className="p-4">
                <p className="text-xs text-fg-subtle">{label}</p>
                <p className="tabular mt-1 text-xl font-semibold text-fg">{value}</p>
              </Card>
            ))}
          </div>
        ) : null}

        <div className="space-y-5">
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { value: 'funding', label: 'Open now' },
              { value: 'trading', label: 'Trading' },
              { value: 'settled', label: 'Finished' },
              { value: 'all', label: 'All' },
            ]}
          />
          {error ? <Alert>{error.message}</Alert> : null}
          {loading && !data ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-64" />
              ))}
            </div>
          ) : null}
          {data && !pies.length ? (
            <EmptyState
              icon={FiPieChart}
              title={tab === 'funding' ? 'No Pie is open right now' : 'Nothing here yet'}
              description={tab === 'funding' ? 'Turn on notifications and we will tell you when the next one opens.' : undefined}
            />
          ) : null}
          {pies.length ? (
            <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pies.map((pie) => (
                <StaggerItem key={pie._id}>
                  <PieCard pie={pie} />
                </StaggerItem>
              ))}
            </Stagger>
          ) : null}
        </div>
      </Container>
    </>
  );
}
