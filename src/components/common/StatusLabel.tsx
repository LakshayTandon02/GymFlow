import React from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileEdit,
  MinusCircle,
  PauseCircle,
  Send,
  Sparkles,
  XCircle,
} from 'lucide-react';
import {
  EnquiryStatus,
  MemberStatus,
  PaymentStatus,
  ReminderStatus,
} from '../../types/gym';

export const MemberStatusLabel: React.FC<{ status: MemberStatus }> = ({ status }) => {
  if (status === 'Active') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 whitespace-nowrap">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        <span>Active</span>
      </span>
    );
  }
  if (status === 'Pending') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 whitespace-nowrap">
        <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
        <span>Pending</span>
      </span>
    );
  }
  if (status === 'Inactive') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 whitespace-nowrap">
        <PauseCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span>Inactive</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 whitespace-nowrap">
      <XCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
      <span>Expired</span>
    </span>
  );
};

export const PaymentStatusLabel: React.FC<{ status: PaymentStatus }> = ({ status }) => {
  if (status === 'Paid') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 whitespace-nowrap">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        <span>Paid</span>
      </span>
    );
  }
  if (status === 'Pending') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 whitespace-nowrap">
        <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
        <span>Payment Pending</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 whitespace-nowrap">
      <XCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
      <span>Failed</span>
    </span>
  );
};

export const ReminderStatusLabel: React.FC<{ status: ReminderStatus }> = ({ status }) => {
  if (status === 'Scheduled') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 whitespace-nowrap">
        <Send className="w-3.5 h-3.5 text-blue-600 shrink-0" />
        <span>Scheduled</span>
      </span>
    );
  }
  if (status === 'Drafted') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 whitespace-nowrap">
        <FileEdit className="w-3.5 h-3.5 text-amber-600 shrink-0" />
        <span>Drafted</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 whitespace-nowrap">
      <MinusCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
      <span>Not Sent</span>
    </span>
  );
};

export const EnquiryStatusLabel: React.FC<{ status: EnquiryStatus }> = ({ status }) => {
  if (status === 'Converted') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 whitespace-nowrap">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        <span>Converted</span>
      </span>
    );
  }
  if (status === 'Trial Scheduled') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 whitespace-nowrap">
        <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
        <span>Trial Scheduled</span>
      </span>
    );
  }
  if (status === 'Contacted') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 whitespace-nowrap">
        <Send className="w-3.5 h-3.5 text-amber-600 shrink-0" />
        <span>Contacted</span>
      </span>
    );
  }
  if (status === 'Lost') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 whitespace-nowrap">
        <XCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span>Lost</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 whitespace-nowrap">
      <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
      <span>New</span>
    </span>
  );
};
