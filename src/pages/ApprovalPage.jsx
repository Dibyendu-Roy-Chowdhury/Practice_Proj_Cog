import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { Button, message } from 'antd';

const Field = ({ label, children }) => (
  <div>
    <p className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-2.5">{label}</p>
    <div className="rounded-md border border-solid border-gray-300 tracking-wide bg-slate-50 px-3 py-2.5 text-sm text-ink-secondary">
      {children}
    </div>
  </div>
);

const ApprovalPage = ({ request, onBack, onApprove, onReject }) => {
  if (!request) return null;

  const handleApprove = () => {
    message.success(`${request.agentName} approved and deployed.`);
    onApprove?.(request);
  };

  const handleReject = () => {
    message.error(`${request.agentName} request rejected.`);
    onReject?.(request);
  };

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm font-medium text-ink-secondary mb-4"
        style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}
      >
        <ChevronLeft size={14} strokeWidth={2} />
        Back to Pending Requests
      </button>

      <div className="w-full p-6 mt-4" style={{ boxSizing: 'border-box' }}>
        <h2 className="text-2xl font-bold text-ink-primary mb-2">Request Approval: Create New AI Agent</h2>
        <p className="text-md text-ink-secondary mb-12 font-light">
          Please review the configuration details below before approving or rejecting the agent deployment request.
        </p>

        <div className="grid grid-cols-2 gap-x-6 gap-y-6">
          <Field label="Agent Name">{request.agentName}</Field>
          <Field label="Operational Workspace">{request.workspaceFull || request.workspace}</Field>
          <Field label="Primary LLM Model Engine">{request.model}</Field>
          <Field label="Requested By">{request.requestedBy} ({request.requestedByRole})</Field>
        </div>

        <div className="mt-6">
          <Field label="Initial System Mandate / Description">{request.description}</Field>
        </div>

        <div className="flex justify-end gap-3 mt-12">
          <Button danger onClick={handleReject} style={{ fontWeight: 600 }}>
            Reject Request
          </Button>
          <Button type="primary" onClick={handleApprove} style={{ fontWeight: 600, background: '#3B5BFB', borderColor: '#3B5BFB' }}>
            Approve &amp; Deploy
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ApprovalPage;
