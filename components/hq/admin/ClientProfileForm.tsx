import React from 'react';

export interface ClientProfileDraft {
  company: string;
  name: string;
  email: string;
  phone: string;
  billingEmail: string;
  billingContactName: string;
  addressCity: string;
  addressState: string;
  addressPostal: string;
  addressCountry: string;
  preferredCommunication: 'email' | 'sms' | 'phone';
  timezone: string;
  clientStatus: 'active' | 'prospect' | 'paused';
  notes: string;
}

interface ClientProfileFormProps {
  value: ClientProfileDraft;
  onChange: (next: ClientProfileDraft) => void;
}

export const EMPTY_CLIENT_PROFILE_DRAFT: ClientProfileDraft = {
  company: '',
  name: '',
  email: '',
  phone: '',
  billingEmail: '',
  billingContactName: '',
  addressCity: '',
  addressState: '',
  addressPostal: '',
  addressCountry: 'US',
  preferredCommunication: 'email',
  timezone: 'America/New_York',
  clientStatus: 'prospect',
  notes: '',
};

const fieldClass =
  'w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100';
const labelClass = 'block text-xs uppercase tracking-wide text-zinc-500';

const ClientProfileForm: React.FC<ClientProfileFormProps> = ({ value, onChange }) => {
  const patch = (next: Partial<ClientProfileDraft>) => onChange({ ...value, ...next });

  return (
    <div className="space-y-3 min-w-0">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <label className={labelClass}>
          Company
          <input value={value.company} onChange={(e) => patch({ company: e.target.value })} className={fieldClass} />
        </label>
        <label className={labelClass}>
          Primary Contact
          <input value={value.name} onChange={(e) => patch({ name: e.target.value })} className={fieldClass} />
        </label>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <label className={labelClass}>
          Contact Email
          <input value={value.email} onChange={(e) => patch({ email: e.target.value })} className={fieldClass} />
        </label>
        <label className={labelClass}>
          Contact Phone
          <input value={value.phone} onChange={(e) => patch({ phone: e.target.value })} className={fieldClass} />
        </label>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <label className={labelClass}>
          Billing Email
          <input value={value.billingEmail} onChange={(e) => patch({ billingEmail: e.target.value })} className={fieldClass} />
        </label>
        <label className={labelClass}>
          Billing Contact
          <input
            value={value.billingContactName}
            onChange={(e) => patch({ billingContactName: e.target.value })}
            className={fieldClass}
          />
        </label>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <label className={labelClass}>
          City
          <input value={value.addressCity} onChange={(e) => patch({ addressCity: e.target.value })} className={fieldClass} />
        </label>
        <label className={labelClass}>
          State
          <input value={value.addressState} onChange={(e) => patch({ addressState: e.target.value })} className={fieldClass} />
        </label>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <label className={labelClass}>
          Postal Code
          <input
            value={value.addressPostal}
            onChange={(e) => patch({ addressPostal: e.target.value })}
            className={fieldClass}
          />
        </label>
        <label className={labelClass}>
          Country
          <input
            value={value.addressCountry}
            onChange={(e) => patch({ addressCountry: e.target.value })}
            className={fieldClass}
          />
        </label>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <label className={labelClass}>
          Preferred Channel
          <select
            value={value.preferredCommunication}
            onChange={(e) => patch({ preferredCommunication: e.target.value as ClientProfileDraft['preferredCommunication'] })}
            className={fieldClass}
          >
            <option value="email">Email</option>
            <option value="sms">SMS</option>
            <option value="phone">Phone</option>
          </select>
        </label>
        <label className={labelClass}>
          Timezone
          <input value={value.timezone} onChange={(e) => patch({ timezone: e.target.value })} className={fieldClass} />
        </label>
        <label className={labelClass}>
          Status
          <select
            value={value.clientStatus}
            onChange={(e) => patch({ clientStatus: e.target.value as ClientProfileDraft['clientStatus'] })}
            className={fieldClass}
          >
            <option value="prospect">Prospect</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
          </select>
        </label>
      </div>
      <label className={labelClass}>
        Notes
        <textarea
          value={value.notes}
          onChange={(e) => patch({ notes: e.target.value })}
          rows={3}
          className={fieldClass}
        />
      </label>
    </div>
  );
};

export default ClientProfileForm;
