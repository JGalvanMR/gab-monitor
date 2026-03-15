// src/components/autorizacion/ModalAuth.tsx
import { useState, useRef, useEffect } from 'react';
import { autorizacionApi } from '../../api/inventarioApi';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export function ModalAuth({ onClose, onSuccess }: Props) {
  const [contrasena, setContrasena] = useState('');
  const [error, setError]           = useState('');
  const [cargando, setCargando]     = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleVerificar = async () => {
    if (!contrasena.trim()) return;
    setCargando(true);
    setError('');
    try {
      const { autorizado } = await autorizacionApi.verificarContrasena(contrasena);
      if (autorizado) {
        onSuccess();
      } else {
        setError('Contraseña incorrecta');
        setContrasena('');
        inputRef.current?.focus();
      }
    } catch {
      setError('Error al verificar. Intente de nuevo.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-800 border border-gray-600 rounded-lg p-6 w-80 shadow-xl">
        <h2 className="text-white font-bold text-center mb-4 text-lg">
          🔐 AUTORIZACIÓN
        </h2>
        <p className="text-gray-300 text-sm text-center mb-4">
          Ingrese la contraseña para activar el modo de autorización
        </p>

        <input
          ref={inputRef}
          type="password"
          value={contrasena}
          onChange={e => setContrasena(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === 'Enter' && handleVerificar()}
          className="w-full bg-gray-700 text-white uppercase px-3 py-2 rounded border border-gray-500 focus:border-blue-400 outline-none mb-3 text-center tracking-widest font-mono"
          placeholder="CONTRASEÑA"
          maxLength={20}
          disabled={cargando}
        />

        {error && (
          <p className="text-red-400 text-sm text-center mb-3">{error}</p>
        )}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded bg-gray-600 hover:bg-gray-500 text-white text-sm"
            disabled={cargando}
          >
            Cancelar
          </button>
          <button
            onClick={handleVerificar}
            className="flex-1 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold disabled:opacity-50"
            disabled={cargando}
          >
            {cargando ? '...' : 'Verificar'}
          </button>
        </div>
      </div>
    </div>
  );
}
