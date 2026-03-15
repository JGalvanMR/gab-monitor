// src/hooks/useInventario.ts
// CORRECCIÓN D-07: Eliminar importaciones duplicadas de 'react'
// El archivo original importaba useEffect dos veces, causando error de compilación TypeScript.

import { useEffect, useRef, useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as signalR from '@microsoft/signalr';
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
      setSegundos(prev => (prev <= 1 ? INTERVALO_REFRESCO_SEG : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Reiniciar contador cuando termina un fetch
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

export function useSignalRInventario() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl('/hubs/inventario')
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    connection.on('InventarioActualizado', () => {
      queryClient.invalidateQueries({ queryKey: ['inventario'] });
    });

    connection
      .start()
      .catch(err => console.warn('SignalR no disponible (modo polling activo):', err));

    return () => {
      connection.stop();
    };
  }, [queryClient]);
}
