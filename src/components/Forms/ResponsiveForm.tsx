import React from 'react';

export interface FormField {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  help?: string;
  fullWidth?: boolean;
  required?: boolean;
  value?: any;
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  options?: { label: string; value: string | number }[];
}

interface ResponsiveFormProps {
  fields: FormField[];
  onSubmit: (e: React.FormEvent) => void;
  onCancel?: () => void;
  submitLabel?: string;
  cancelLabel?: string;
}

export function ResponsiveForm({
  fields,
  onSubmit,
  onCancel,
  submitLabel = 'Submit',
  cancelLabel = 'Cancel'
}: ResponsiveFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4 sm:space-y-6">
      <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {fields.map((field) => (
          <div
            key={field.name}
            className={`${field.fullWidth ? 'md:col-span-2 lg:col-span-3' : ''}`}
          >
            <label className="block text-sm font-semibold mb-1.5 text-on-surface">
              {field.label} {field.required && <span className="text-error">*</span>}
            </label>
            
            {field.type === 'select' ? (
              <select
                name={field.name}
                value={field.value}
                onChange={field.onChange}
                required={field.required}
                className="
                  w-full
                  h-11 md:h-10 lg:h-9
                  px-3
                  text-[16px] md:text-sm
                  border border-outline-variant rounded-md
                  bg-surface
                  focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none
                  transition-colors
                "
              >
                <option value="" disabled hidden>
                  {field.placeholder || 'Select...'}
                </option>
                {field.options?.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            ) : field.type === 'textarea' ? (
              <textarea
                name={field.name}
                value={field.value}
                onChange={field.onChange}
                placeholder={field.placeholder}
                required={field.required}
                className="
                  w-full
                  min-h-[100px]
                  p-3
                  text-[16px] md:text-sm
                  border border-outline-variant rounded-md
                  bg-surface
                  focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none
                  transition-colors
                "
              />
            ) : (
              <input
                type={field.type || 'text'}
                name={field.name}
                value={field.value}
                onChange={field.onChange}
                placeholder={field.placeholder}
                required={field.required}
                className="
                  w-full
                  h-11 md:h-10 lg:h-9
                  px-3
                  text-[16px] md:text-sm
                  border border-outline-variant rounded-md
                  bg-surface
                  focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none
                  transition-colors
                "
              />
            )}
            
            {field.help && (
              <p className="text-xs text-on-surface-variant mt-1.5">{field.help}</p>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2 md:gap-3 pt-4 md:pt-6">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 md:flex-none px-4 h-11 md:h-10 lg:h-9 rounded-md border border-outline-variant font-medium text-on-surface hover:bg-surface-variant transition-colors"
          >
            {cancelLabel}
          </button>
        )}
        <button
          type="submit"
          className="flex-1 md:flex-none px-4 h-11 md:h-10 lg:h-9 rounded-md bg-primary text-on-primary font-medium hover:bg-primary/90 transition-colors"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
