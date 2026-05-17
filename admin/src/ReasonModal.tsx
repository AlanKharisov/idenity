import { useState } from 'react';

type Props = {
  title: string;
  description: string;
  confirmLabel: string;
  confirmVariant: 'btn-warn' | 'btn-danger';
  reasonRequired?: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => Promise<void> | void;
};

export default function ReasonModal({
  title,
  description,
  confirmLabel,
  confirmVariant,
  reasonRequired,
  onCancel,
  onConfirm,
}: Props) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (reasonRequired && !reason.trim()) return;
    setBusy(true);
    try {
      await onConfirm(reason.trim());
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={busy ? undefined : onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>{title}</h3>
        <p>{description}</p>
        <textarea
          placeholder={reasonRequired ? 'Reason (required)…' : 'Reason (optional)…'}
          value={reason}
          onChange={e => setReason(e.target.value)}
          disabled={busy}
        />
        <div className="actions">
          <button className="btn" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button
            className={`btn ${confirmVariant}`}
            onClick={submit}
            disabled={busy || (reasonRequired ? !reason.trim() : false)}
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
