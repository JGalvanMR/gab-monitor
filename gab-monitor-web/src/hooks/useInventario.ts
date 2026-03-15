// src/hooks/useInventario.ts
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState, useCallback } from 'react';
import { inventarioApi } from '../api/inventarioApi';
import type { FiltroInventario } from '../types/inventario.types';

/** 900 segundos = 15 minutos — igual que el timer1 del WinForms (RN-010) */
const INTERVALO_REFRESCO_SEG = 900;

export function useInventario(filtro: FiltroInventario, buscar: string) {
  const [segundos, setSegundos] = useState(INTERVALO_REFRESCO_SEG);

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['inventario', filtro, buscar],
    queryFn: () => inventarioApi.obtenerConsolidado(filtro, buscar),
    staleTime: INTERVALO_REFRESCO_SEG * 1000,
    refetchInterval: INTERVALO_REFRESCO_SEG * 1000,
    refetchIntervalInBackground: false,
  });

  // Cuenta regresiva visual — equivalente a LblAct en WinForms (RN-010)
  useEffect(() => {
    const timer = setInterval(() => {
      setSegundos(prev => {
        if (prev <= 1) {
          return INTERVALO_REFRESCO_SEG;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Reiniciar contador cuando se hace un fetch
  useEffect(() => {
    if (!isFetching) {
      setSegundos(INTERVALO_REFRESCO_SEG);
    }
  }, [isFetching]);

  const refrescarManual = useCallback(() => {
    setSegundos(INTERVALO_REFRESCO_SEG);
    refetch();
  }, [refetch]);

  return {
    data,
    isLoading,
    isFetching,
    error,
    segundosHastaRefresco: segundos,
    refrescarManual,
  };
}

// ─── Hook para SignalR (refresco en tiempo real) ───────────────────────────

import { useEffect as useEffectSR, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import { useQueryClient } from '@tanstack/react-query';

export function useSignalRInventario() {
  const queryClient = useQueryClient();
  const connRef = useRef<signalR.HubConnection | null>(null);

  useEffectSR(() => {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl('/hubs/inventario')
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    connRef.current = connection;

    connection.on('InventarioActualizado', () => {
      // Invalida y refresca automáticamente cuando el backend notifica
      queryClient.invalidateQueries({ queryKey: ['inventario'] });
    });

    connection
      .start()
      .catch(err => console.warn('SignalR no disponible (modo polling):', err));

    return () => {
      connection.stop();
    };
  }, [queryClient]);
}
