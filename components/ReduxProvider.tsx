'use client';

import { Provider } from 'react-redux';
import { persistor, store } from '../store/store';
import { PersistGate } from 'redux-persist/integration/react';
import { AuthRestore } from './AuthRestore';
import { DisplayCurrencyProvider } from '@/contexts/DisplayCurrencyContext';

/** Shown while redux-persist rehydrates; avoids a blank screen during navigation/refresh. */
function RehydrateFallback() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        width: '100%',
        background: '#f5f6fa',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes rehydrate-spin { to { transform: rotate(360deg); } }
        .rehydrate-spinner {
          width: 32px; height: 32px;
          border: 3px solid #e2e8f0;
          border-top-color: #4f6ef7;
          border-radius: 50%;
          animation: rehydrate-spin 0.7s linear infinite;
        }
      ` }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div className="rehydrate-spinner" />
        <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Cargando...</span>
      </div>
    </div>
  );
}

export function ReduxProvider({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <PersistGate loading={<RehydrateFallback />} persistor={persistor}>
        <>
          <AuthRestore />
          <DisplayCurrencyProvider>{children}</DisplayCurrencyProvider>
        </>
      </PersistGate>
    </Provider>
  );
}