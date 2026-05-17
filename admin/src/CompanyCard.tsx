import type { Company } from './api';

type Props = {
  company: Company;
  onApprove: () => void;
  onReject: () => void;
  onBan: () => void;
  onUnban: () => void;
};

function statusOf(c: Company): 'pending' | 'approved' | 'rejected' | 'banned' | 'none' {
  if (c.banned) return 'banned';
  if (c.companyApproved) return 'approved';
  if (c.pendingApproval) return 'pending';
  if (c.approvalStatus === 'rejected') return 'rejected';
  return 'none';
}

function fmtDate(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

export default function CompanyCard({ company, onApprove, onReject, onBan, onUnban }: Props) {
  const status = statusOf(company);

  return (
    <div className="card">
      <div className="card-head">
        <div>
          <h3>{company.companyName || company.name || '—'}</h3>
          <div className="sub">
            {company.name}
            {company.username ? ` · @${company.username}` : ''}
            {' · '}
            {company.email}
          </div>
        </div>
        {status !== 'none' && (
          <span className={`badge badge-${status}`}>{status}</span>
        )}
      </div>

      <div className="row">
        <div className="field">
          <label>Registration #</label>
          <span>{company.registrationNumber || '—'}</span>
        </div>
        <div className="field">
          <label>Contact email</label>
          <span>{company.contactEmail || '—'}</span>
        </div>
        <div className="field">
          <label>Phone</label>
          <span>{company.phone || '—'}</span>
        </div>
        <div className="field">
          <label>Submitted</label>
          <span>{fmtDate(company.approvalRequestedAt)}</span>
        </div>
        {company.reviewedAt && (
          <div className="field">
            <label>Reviewed</label>
            <span>{fmtDate(company.reviewedAt)}</span>
          </div>
        )}
        <div className="field">
          <label>UID</label>
          <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{company.uid}</span>
        </div>
      </div>

      {company.businessDescription && (
        <div className="desc">{company.businessDescription}</div>
      )}

      {company.rejectionReason && status === 'rejected' && (
        <div className="desc" style={{ color: 'var(--danger)' }}>
          <strong>Rejection reason:</strong> {company.rejectionReason}
        </div>
      )}

      {company.banReason && status === 'banned' && (
        <div className="desc" style={{ color: '#c4b5fd' }}>
          <strong>Ban reason:</strong> {company.banReason}
        </div>
      )}

      <div className="actions">
        {status !== 'approved' && status !== 'banned' && (
          <button className="btn btn-primary" onClick={onApprove}>
            Approve
          </button>
        )}
        {(status === 'pending' || status === 'approved') && (
          <button className="btn btn-warn" onClick={onReject}>
            Reject
          </button>
        )}
        {status !== 'banned' ? (
          <button className="btn btn-danger" onClick={onBan}>
            Ban
          </button>
        ) : (
          <button className="btn" onClick={onUnban}>
            Unban
          </button>
        )}
      </div>
    </div>
  );
}
