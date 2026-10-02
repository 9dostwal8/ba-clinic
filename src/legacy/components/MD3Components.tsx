// @ts-nocheck
import React from 'react';
import { LucideIcon } from 'lucide-react';
import { md3 } from '../utils/md3Styles';

interface MD3ButtonProps {
  variant?: 'filled' | 'outlined' | 'text' | 'tonal' | 'elevated';
  children: React.ReactNode;
  onClick?: () => void;
  icon?: LucideIcon;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  fullWidth?: boolean;
}

export function MD3Button({
  variant = 'filled',
  children,
  onClick,
  icon: Icon,
  disabled = false,
  type = 'button',
  className = '',
  fullWidth = false,
}: MD3ButtonProps) {
  const baseClass = md3.components[`${variant}Button`];
  const widthClass = fullWidth ? 'w-full' : '';
  const disabledClass = disabled ? md3.states.disabled : '';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClass} ${widthClass} ${disabledClass} ${className} flex items-center justify-center gap-2`}
    >
      {Icon && <Icon className="w-5 h-5" />}
      {children}
    </button>
  );
}

interface MD3CardProps {
  variant?: 'filled' | 'elevated' | 'outlined';
  children: React.ReactNode;
  className?: string;
}

export function MD3Card({ variant = 'elevated', children, className = '' }: MD3CardProps) {
  const baseClass = md3.components[`${variant}Card`];
  return <div className={`${baseClass} ${className}`}>{children}</div>;
}

interface MD3ChipProps {
  children: React.ReactNode;
  selected?: boolean;
  onClick?: () => void;
  icon?: LucideIcon;
  onRemove?: () => void;
}

export function MD3Chip({ children, selected = false, onClick, icon: Icon, onRemove }: MD3ChipProps) {
  const baseClass = selected ? md3.components.chipSelected : md3.components.chip;

  return (
    <button onClick={onClick} className={`${baseClass} flex items-center gap-2`}>
      {Icon && <Icon className="w-4 h-4" />}
      <span>{children}</span>
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1 hover:bg-black/10 rounded-full p-0.5"
        >
          <span className="text-xs">×</span>
        </button>
      )}
    </button>
  );
}

interface MD3TextFieldProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  error?: string;
  helperText?: string;
  required?: boolean;
  variant?: 'outlined' | 'filled';
  fullWidth?: boolean;
}

export function MD3TextField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  disabled = false,
  error,
  helperText,
  required = false,
  variant = 'outlined',
  fullWidth = true,
}: MD3TextFieldProps) {
  const inputClass = variant === 'outlined' ? md3.components.textField : md3.components.textFieldFilled;
  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <div className={widthClass}>
      {label && (
        <label className={`block ${md3.typography.labelMedium} text-neutral-700 mb-2`}>
          {label}
          {required && <span className="text-red-600 ml-1">*</span>}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={`${inputClass} ${error ? 'border-red-600' : ''} ${disabled ? md3.states.disabled : ''}`}
      />
      {(error || helperText) && (
        <p className={`${md3.typography.bodySmall} mt-1 ${error ? 'text-red-600' : 'text-neutral-600'}`}>
          {error || helperText}
        </p>
      )}
    </div>
  );
}

interface MD3DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export function MD3Dialog({ open, onClose, title, children, actions }: MD3DialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className={`${md3.components.dialog} max-w-md w-full mx-4 relative z-10`}>
        <h2 className={`${md3.typography.headlineSmall} text-neutral-900 mb-4`}>{title}</h2>
        <div className="mb-6">{children}</div>
        {actions && <div className="flex justify-end gap-2">{actions}</div>}
      </div>
    </div>
  );
}

interface MD3ListItemProps {
  children: React.ReactNode;
  selected?: boolean;
  onClick?: () => void;
  leadingIcon?: LucideIcon;
  trailingIcon?: LucideIcon;
}

export function MD3ListItem({
  children,
  selected = false,
  onClick,
  leadingIcon: LeadingIcon,
  trailingIcon: TrailingIcon,
}: MD3ListItemProps) {
  const baseClass = selected ? md3.components.listItemSelected : md3.components.listItem;

  return (
    <button onClick={onClick} className={`${baseClass} w-full flex items-center justify-between`}>
      <div className="flex items-center gap-3">
        {LeadingIcon && <LeadingIcon className="w-5 h-5" />}
        <span>{children}</span>
      </div>
      {TrailingIcon && <TrailingIcon className="w-5 h-5" />}
    </button>
  );
}

interface MD3FABProps {
  icon: LucideIcon;
  onClick: () => void;
  size?: 'small' | 'medium' | 'large';
  label?: string;
  className?: string;
}

export function MD3FAB({ icon: Icon, onClick, size = 'medium', label, className = '' }: MD3FABProps) {
  const sizeClass =
    size === 'small'
      ? md3.components.fabSmall
      : size === 'large'
      ? md3.components.fabLarge
      : md3.components.fab;

  if (label) {
    return (
      <button
        onClick={onClick}
        className={`${sizeClass} ${className} px-6 h-14 w-auto rounded-2xl gap-2 flex-row`}
      >
        <Icon className="w-6 h-6" />
        <span className={md3.typography.labelLarge}>{label}</span>
      </button>
    );
  }

  return (
    <button onClick={onClick} className={`${sizeClass} ${className}`}>
      <Icon className="w-6 h-6" />
    </button>
  );
}
