import React from 'react';
import { CloudOff, RefreshCw, WifiOff } from 'lucide-react';

interface Props {
  isOnline: boolean;
  isCloudSignedIn: boolean;
  pendingCount: number;
  isSyncing: boolean;
  onSyncNow: () => void;
}

export const ConnectivityBanner: React.FC<Props> = ({
  isOnline,
  isCloudSignedIn,
  pendingCount,
  isSyncing,
  onSyncNow,
}) => {
  if (isOnline && pendingCount === 0) return null;

  return (
    <div
      role="status"
      className={`px-3 sm:px-4 py-1.5 text-[11px] sm:text-xs font-medium flex items-center justify-between gap-2 border-b ${
        !isOnline
          ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-800'
          : isCloudSignedIn
          ? 'bg-orange-50 dark:bg-orange-950/50 text-orange-900 dark:text-orange-200 border-orange-200 dark:border-orange-800'
          : 'bg-stone-100 dark:bg-stone-900 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-800'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        {!isOnline ? (
          <>
            <WifiOff className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">
              Mode Offline — Disimpan di perangkat & otomatis sinkron saat online.
            </span>
          </>
        ) : isCloudSignedIn ? (
          <>
            <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${isSyncing ? 'animate-spin' : ''}`} />
            <span className="truncate">
              {pendingCount} perubahan lokal menunggu sinkronisasi ke cloud.
            </span>
          </>
        ) : (
          <>
            <CloudOff className="w-3.5 h-3.5 shrink-0 text-stone-500" />
            <span className="truncate">
              Mode PIN Lokal · {pendingCount} transaksi tersimpan di perangkat (masuk Google/Email untuk sinkron cloud).
            </span>
          </>
        )}
      </div>

      {isOnline && pendingCount > 0 && isCloudSignedIn && (
        <button
          type="button"
          onClick={onSyncNow}
          disabled={isSyncing}
          className="px-2.5 py-1 rounded-lg bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0"
        >
          {isSyncing ? 'Menyinkronkan...' : 'Sinkronkan'}
        </button>
      )}
    </div>
  );
};

