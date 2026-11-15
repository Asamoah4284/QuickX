import { Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FiUsers } from 'react-icons/fi';
import { useApi } from '../../lib/useApi';
import { Container, EmptyState, PageLoader } from '../../ui/primitives';
import FeatureGate from '../billing/FeatureGate';

/** Sends members to the community hub, which is addressed by the mentor's id. */
function OpenCommunity() {
  const { data, loading, error } = useApi('/api/owner');
  if (loading) return <PageLoader label="Opening the community" />;
  if (error || !data?.owner) {
    return (
      <Container className="py-16">
        <EmptyState
          icon={FiUsers}
          title="The community is not available yet"
          description={error?.message || 'Please check back shortly.'}
        />
      </Container>
    );
  }
  return <Navigate to={`/instructors/${data.owner.id}/community`} replace />;
}

export default function CommunityEntry() {
  return (
    <>
      <Helmet>
        <title>Community — QuickX</title>
      </Helmet>
      <FeatureGate feature="community">
        <OpenCommunity />
      </FeatureGate>
    </>
  );
}
