// @ts-nocheck
import React from 'react';
import SuperAdminOverviewModule from '../modules/SuperAdminOverviewModule';

export function SuperAdminDashboard({ onNavigate }: { onNavigate?: (page: string) => void }) {
  return <SuperAdminOverviewModule onNavigate={onNavigate} />;
}
