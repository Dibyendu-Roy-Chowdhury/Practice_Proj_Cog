import React, { useState, useSyncExternalStore } from 'react';
import { Pagination, Spin, Tooltip } from 'antd';
import { FileText, Check, Clock } from 'lucide-react';
import StatusBadge from '../components/common/onbordingpagestatusbadge';
import ApprovalPage from './ApprovalPage';
import { subscribe, getRequests, getHasSynced, approveRequest, rejectRequest } from '../services/onboardingStore';

const PAGE_SIZE = 6;

const CARD_BORDER_COLOR = {
  approved: '#2DB81F',
  pending:  '#E9C71D',
};
const CARD_BG = '#FFFFFF';

const STAT_ACCENTS = {
  total:    { border: '#0BA5EC', bg: '#DBEAFE' },
  approved: { border: '#065F46', bg: '#D1FAE5' },
  pending:  { border: '#E9C71D', bg: 'rgba(233,199,29,0.22)' },
};

const getModelName = (model = '') => {
  // Handle formats like:
  // "Amazon Bedrock (Claude 3.5 Sonnet)"
  const bracketName = model.match(/\(([^)]+)\)/)?.[1];

  const cleaned = bracketName || model
    .split(/[/.]/)
    .pop()
    .replace(/-v\d+(:\d+)?$/i, '')
    .replace(/:\d+$/, '');

  return cleaned.length > 20
    ? `${cleaned.slice(0, 17)}...`
    : cleaned;
};

const StatTile = ({ value, label, desc, icon: Icon, accent, dark, extra}) => (
  <div
    className={`rounded-md shadow-card px-6 py-3.5 border border-[#D0D0CE]/60 ${
      dark ? 'bg-[#000048]' : 'bg-[#ffffff]'
    }`}
  >
    <div className="flex items-start justify-between">
      <div>
        <p
          className={`text-sm font-bold mt-1 ${
            dark ? 'text-[#C7D0E4]' : 'text-[#6B7280]'
          }`}
        >
          {label}
        </p>

        <span className="flex items-center gap-3 mt-1">
          <p
            className={`text-3xl font-bold leading-none ${
              dark ? 'text-[#FFFFFF]' : 'text-[#0F1B3D]'
            }`}
          >
            {value}
          </p>
          <p
            className={`text-xs font-light leading-none ${
              dark ? 'text-[#C7D0E4]' : 'text-[#6B7280]'
            }`}
            style={{ transform: 'translateY(-8px)' }}
          >
            {desc}
          </p>
        </span>
      </div>

      <span
        className="flex-shrink-0 flex items-center justify-center rounded-full"
        style={{
          width: 32,
          height: 32,
          background: accent.bg,
        }}
      >
        <Icon size={16} strokeWidth={2} color={accent.border} />
      </span>
    </div>
    {extra && (
  <div className="flex justify-end -mt-6 mb-1 ">
    {extra}
  </div>
)}
  </div>
);

const OnboardingRequestCard = ({ request, onReview }) => {
  const status = request.status === 'approved' ? 'approved' : 'pending';
  const interactive = status !== 'approved';

  return (
    <button
      onClick={() => { if (interactive) onReview(request); }}
      className="text-left rounded-md p-4 transition-colors flex flex-col h-full shadow-card"
      style={{
        background: CARD_BG,
        borderTop: `4px solid ${CARD_BORDER_COLOR[status]}`,
        borderLeft: `1px solid ${CARD_BORDER_COLOR[status]}`,
        borderRight: `1px solid ${CARD_BORDER_COLOR[status]}`,
        borderBottom: `1px solid ${CARD_BORDER_COLOR[status]}`,
        outline: 'none',
        cursor: interactive ? 'pointer' : 'default',
        boxSizing: 'border-box',
        width: '100%',
        minHeight: 180,
      }}
    >
      <div className="mb-6 mt-2">
        <StatusBadge variant={status === 'approved' ? 'success' : 'warning'} dot
        dotColor={CARD_BORDER_COLOR[status]}
        className="text-xs font-medium"
        style={{
          color: status === 'approved'
          ? '#065F46'
          : '#E9C71D'
          }}>

        {status === 'approved' ? 'Approved' : 'Pending Review'}
        </StatusBadge>
      </div>

      <p className="text-base font-semibold text-[#0F1B3D] truncate" title={request.agentName}>
        {request.agentName}
      </p>
      <p className="text-xs text-[#6B7280] leading-snug">
        <span className="font-bold uppercase tracking-wide">Requested by: </span>
        {request.requestedBy} ({request.requestedByRole})
      </p>

      <div className="flex items-center  gap-5 mt-auto">
        <Tooltip
          title={`Workspace: ${request.workspace}`}
          overlayStyle={{ maxWidth: 280 }}
          overlayInnerStyle={{ fontSize: 12, lineHeight: 1.5, borderRadius: 6, fontStyle: 'italic', backgroundColor: '#FFFFFF', color: '#000048' }}
          color="#FFFFFF"
        >
          <span
            className="inline-flex items-center justify-center px-4 py-2 rounded-full font-medium text-white truncate flex-auto  w-fit"
            style={{ background: '#7373D8', fontSize: 10 }}
          >
            Workspace: {request.workspace.split('(')[0].trim()}
          </span>
        </Tooltip>
        <Tooltip
          title={`Model: ${request.model}`}
          overlayStyle={{ maxWidth: 280 }}
          overlayInnerStyle={{ fontSize: 12, lineHeight: 1.5, borderRadius: 6, fontStyle: 'italic', backgroundColor: '#FFFFFF', color: '#000048' }}
          color="#FFFFFF"
        >
         <span
          className="inline-flex items-center  justify-center px-4 py-2 rounded-full font-medium text-white   flex-auto w-fit truncate"
          style={{ background: '#7373D8', fontSize: 10 }}
        >
          {/* Model: {request.model} */}
         Model: {getModelName(request.model)}
        </span>

        </Tooltip>
      </div>
    </button>
  );
};

const Onboardingpending = () => {
  // Subscribes to the shared onboardingStore — the same store the sidebar badge
  // reads from, so this page and the badge count can never disagree. The store
  // fetches/polls independently of this component's mount/unmount.
  const requests = useSyncExternalStore(subscribe, getRequests);
  const hasSynced = useSyncExternalStore(subscribe, getHasSynced);
  const [reviewRequest, setReviewRequest] = useState(null);
  const [page, setPage] = useState(1);

  if (!hasSynced) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ minHeight: 'calc(100vh - 48px)' }}
      >
        <Spin size="large" />
      </div>
    );
  }

  const totalCount    = requests.length;
  const approvedCount = requests.filter(r => r.status === 'approved').length;
  const pendingCount  = totalCount - approvedCount;

  const pageCount = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pagedRequests = requests.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleApprove = (request) => {
    approveRequest(request.id);
    setReviewRequest(null);
  };

  const handleReject = (request) => {
    rejectRequest(request.id);
    setReviewRequest(null);
  };

  if (reviewRequest) {
    return (
      <div className="p-6 transition-colors">
        <ApprovalPage
          request={reviewRequest}
          onBack={() => setReviewRequest(null)}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col bg-[#FFFFFF]" style={{ minHeight: 'calc(100vh - 48px)' }}>
      <div className="grid grid-cols-3 gap-4 mb-6 pb-2">
        <StatTile value={totalCount}    label="TOTAL REQUESTS"       desc="All submitted deployment requests" icon={FileText}   accent={STAT_ACCENTS.total} dark />
        <StatTile value={approvedCount} label="APPROVED DEPLOYMENTS" desc="Successfully approved and live"     icon={Check}  accent={STAT_ACCENTS.approved} />
        <StatTile value={pendingCount}  label="PENDING REVIEW"       desc="Requires reviewer attention"        icon={Clock} accent={STAT_ACCENTS.pending}  extra ={<StatusBadge variant='warning' dot dotColor='#E9C71D' className=" text-xs font-extrabold px-4 " style={{ color: '#B45309',backgroundColor: 'rgba(233,199,29,0.22)' }}>Awaiting approval </StatusBadge>}/>
      </div>

      <div className="grid grid-cols-3 gap-x-4 gap-y-8">
        {pagedRequests.map(request => (
          <OnboardingRequestCard
            key={request.id}
            request={request}
            onReview={setReviewRequest}
          />
        ))}
      </div>

      {totalCount > PAGE_SIZE && (
        <div className="flex justify-end mt-auto pt-4">
          <Pagination
            current={currentPage}
            pageSize={PAGE_SIZE}
            total={totalCount}
            onChange={setPage}
            showSizeChanger={false}
          />
        </div>
      )}
    </div>
  );
};

export default Onboardingpending;
 