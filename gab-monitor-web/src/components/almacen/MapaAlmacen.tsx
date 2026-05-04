// src/components/almacen/MapaAlmacen.tsx
// Diseño Corporativo GAB / Mr. Lucky - Profesional y refinado

import { useMemo } from 'react';

interface Props {
  ubicacionActual?: string;
  posicionResaltada?: string;
  soloLectura?: boolean;
  onPosicionClick?: (posicion: string) => void;
  hideDefaultPanel4?: boolean;
}

export function MapaAlmacen({
  ubicacionActual,
  posicionResaltada,
  soloLectura = false,
  onPosicionClick,
  hideDefaultPanel4 = false,
}: Props) {
  const highlight = posicionResaltada?.trim() || ubicacionActual?.trim();

  const esSeleccionada = (id: string): boolean => {
    const base = id.replace('Btn', '');
    return base === highlight || id === highlight;
  };

  const handleClick = (pos: string) => {
    if (!soloLectura && onPosicionClick) onPosicionClick(pos);
  };

  const cursor = soloLectura ? 'default' : 'pointer';
  const opacity = soloLectura ? 0.65 : 1;

  return (
    <div className="relative bg-slate-100 p-1 font-sans rounded-lg border border-slate-200" style={{ width: '789px', height: '644px' }}>
      <Panel1 highlight={highlight} esSeleccionada={esSeleccionada} onClick={handleClick} cursor={cursor} opacity={opacity} />
      <Panel2 highlight={highlight} esSeleccionada={esSeleccionada} onClick={handleClick} cursor={cursor} opacity={opacity} />
      <Panel3 highlight={highlight} esSeleccionada={esSeleccionada} onClick={handleClick} cursor={cursor} opacity={opacity} />
      {!hideDefaultPanel4 && <Panel4 />}
      <Panel5 highlight={highlight} esSeleccionada={esSeleccionada} onClick={handleClick} cursor={cursor} opacity={opacity} />
    </div>
  );
}

// ====================== PANEL 1 ======================
function Panel1({ highlight, esSeleccionada, onClick, cursor, opacity }: any) {
  const racks = useMemo(() => Array.from({ length: 24 }, (_, i) => {
    const num = 1424 - i;
    return { label: num.toString(), top: 4 + i * 14 };
  }), []);

  return (
    <div className="absolute border border-slate-300 rounded" style={{ left: '3px', top: '3px', width: '297px', height: '343px', backgroundColor: '#F8FAFC' }}>
      <button className="absolute text-[7px] font-bold border border-slate-400 bg-slate-200 rounded-sm" style={{ right: '2px', top: '6px', width: '12px', height: '329px', writingMode: 'vertical-rl' }}>1P02</button>
      <button className="absolute text-[7px] font-bold border border-slate-400 bg-slate-200 rounded-sm" style={{ left: '2px', top: '6px', width: '12px', height: '329px', writingMode: 'vertical-rl' }}>1P03</button>
      <div className="absolute text-xs font-normal text-slate-600" style={{ right: '45px', top: '50px', writingMode: 'vertical-rl', letterSpacing: '2px', height: '245px' }}>NIVELES   A B C D</div>
      <div className="absolute text-xs font-normal font-semibold text-emerald-700" style={{ left: '30px', top: '75px', writingMode: 'vertical-rl', height: '168px' }}>MÓDULO 4</div>

      {racks.map((rack, i) => {
        const selected = esSeleccionada(`Btn${1424 - i}`);
        return (
          <button key={i} onClick={() => onClick((1424 - i).toString())} className="absolute text-[5.5px] font-bold border border-slate-400 rounded-sm transition-all duration-150"
            style={{ left: '69px', top: `${4 + i * 14}px`, width: '147px', height: '15px', backgroundColor: selected ? '#D1FAE5' : '#E2E8F0', borderColor: selected ? '#10B981' : '#CBD5E1', color: selected ? '#047857' : '#475569', cursor, opacity }}>
            {1424 - i}
          </button>
        );
      })}
    </div>
  );
}

// ====================== PANEL 2 ======================
function Panel2({ highlight, esSeleccionada, onClick, cursor, opacity }: any) {
  return (
    <div className="absolute border border-slate-300 rounded" style={{ left: '3px', top: '350px', width: '297px', height: '293px', backgroundColor: '#F8FAFC' }}>
      {/* Módulo 1 */}
      <div className="absolute text-[6px] font-bold text-emerald-700" style={{ left: '1px', top: '22px' }}>MÓD.  1</div>
      {Array.from({ length: 10 }, (_, i) => {
        const n = (10 - i).toString().padStart(2, '0');
        const pos = `11${n}`;
        const sel = esSeleccionada(pos);
        return <button key={pos} onClick={() => onClick(pos)} style={{ left: '1px', top: `${34 + i * 25}px`, width: '23px', height: '26px', backgroundColor: sel ? '#D1FAE5' : '#E2E8F0', borderColor: sel ? '#10B981' : '#CBD5E1', color: sel ? '#047857' : '#475569', cursor, opacity }} className="absolute text-[5.5px] font-bold border border-slate-400 rounded-sm transition-all duration-150">{10 - i}</button>;
      })}

      {/* Módulo 3 */}
      <div className="absolute text-[6px] font-bold text-emerald-700" style={{ right: '20px', top: '8px' }}>MÓD.    3</div>
      {Array.from({ length: 5 }, (_, i) => {
        const n = (i + 1).toString().padStart(2, '0');
        const pos = `13${n}`;
        const sel = esSeleccionada(pos);
        return <button key={pos} onClick={() => onClick(pos)} style={{ left: `${70 + i * 28}px`, top: '3px', width: '29px', height: '26px', backgroundColor: sel ? '#D1FAE5' : '#E2E8F0', borderColor: sel ? '#10B981' : '#CBD5E1', color: sel ? '#047857' : '#475569', cursor, opacity }} className="absolute text-[5.5px] font-bold border border-slate-400 rounded-sm transition-all duration-150">{n}</button>;
      })}

      {/* Módulo 2 */}
      {Array.from({ length: 14 }, (_, i) => {
        const n = (i + 1).toString().padStart(2, '0');
        const pos = `12${n}`;
        const sel = esSeleccionada(pos);
        return <button key={pos} onClick={() => onClick(pos)} style={{ left: '67px', bottom: `${20 + i * 17}px`, width: '147px', height: '17px', backgroundColor: sel ? '#D1FAE5' : '#E2E8F0', borderColor: sel ? '#10B981' : '#CBD5E1', color: sel ? '#047857' : '#475569', cursor, opacity }} className="absolute text-[5.5px] font-bold border border-slate-400 rounded-sm transition-all duration-150">12{n}</button>;
      })}

      <div className="absolute text-xs font-normal text-slate-600" style={{ right: '38px', top: '64px', writingMode: 'vertical-rl', letterSpacing: '2px', height: '215px' }}>NIVELES   A B</div>
      <div className="absolute text-xs font-normal text-emerald-700 font-semibold" style={{ right: '58px', top: '86px', writingMode: 'vertical-rl', height: '168px' }}>MÓDULO 2</div>
      <button className="absolute text-[7px] font-bold border border-slate-400 bg-slate-200 rounded-sm" style={{ right: '2px', top: '53px', width: '12px', height: '235px', writingMode: 'vertical-rl' }}>1P01</button>
    </div>
  );
}

// ====================== PANEL 3 ======================
function Panel3({ highlight, esSeleccionada, onClick, cursor, opacity }: any) {
  return (
    <div className="absolute border border-slate-300 rounded" style={{ left: '302px', top: '350px', width: '363px', height: '293px', backgroundColor: '#F8FAFC' }}>
      {/* Módulos superiores */}
      <div className="absolute text-[6px] font-bold text-emerald-700" style={{ left: '106px', top: '27px' }}>MÓD.  5</div>
      {['01', '02'].map((n, i) => { const p = `25${n}`; const s = esSeleccionada(p); return <button key={p} onClick={() => onClick(p)} style={{ left: `${103 + i * 24}px`, top: '0px', width: '24px', height: '26px', backgroundColor: s ? '#D1FAE5' : '#E2E8F0', borderColor: s ? '#10B981' : '#CBD5E1', color: s ? '#047857' : '#475569', cursor, opacity }} className="absolute text-[5.5px] font-bold border border-slate-400 rounded-sm transition-all duration-150">{n}</button>; })}

      <div className="absolute text-[6px] font-bold text-emerald-700" style={{ left: '178px', top: '28px' }}>MÓD.  6</div>
      {['01', '02'].map((n, i) => { const p = `26${n}`; const s = esSeleccionada(p); return <button key={p} onClick={() => onClick(p)} style={{ left: `${177 + i * 22}px`, top: '0px', width: '23px', height: '26px', backgroundColor: s ? '#D1FAE5' : '#E2E8F0', borderColor: s ? '#10B981' : '#CBD5E1', color: s ? '#047857' : '#475569', cursor, opacity }} className="absolute text-[5.5px] font-bold border border-slate-400 rounded-sm transition-all duration-150">{n}</button>; })}

      <div className="absolute text-[6px] font-bold text-emerald-700" style={{ left: '286px', top: '28px' }}>MÓD.  7</div>
      {Array.from({ length: 6 }, (_, i) => { const n = (i + 1).toString().padStart(2, '0'); const p = `27${n}`; const s = esSeleccionada(p); return <button key={p} onClick={() => onClick(p)} style={{ left: `${252 + i * 18}px`, top: '1px', width: '19px', height: '26px', backgroundColor: s ? '#D1FAE5' : '#E2E8F0', borderColor: s ? '#10B981' : '#CBD5E1', color: s ? '#047857' : '#475569', cursor, opacity }} className="absolute text-[5.5px] font-bold border border-slate-400 rounded-sm transition-all duration-150">{n}</button>; })}

      {/* Área 2x */}
      <div className="absolute text-[6px] font-bold text-emerald-700" style={{ left: '18px', top: '27px' }}>MÓD.  1</div>
      {Array.from({ length: 3 }, (_, i) => { const n = (i + 1).toString().padStart(2, '0'); const p = `21${n}`; const s = esSeleccionada(p); return <button key={p} onClick={() => onClick(p)} style={{ left: `${7 + i * 21}px`, top: '53px', width: '21px', height: '75px', backgroundColor: s ? '#D1FAE5' : '#E2E8F0', borderColor: s ? '#10B981' : '#CBD5E1', color: s ? '#047857' : '#475569', cursor, opacity }} className="absolute text-[7px] font-bold border border-slate-400 rounded-sm transition-all duration-150">{n}</button>; })}

      {Array.from({ length: 7 }, (_, i) => { const n = (i + 1).toString().padStart(2, '0'); const p = `22${n}`; const s = esSeleccionada(p); return <button key={p} onClick={() => onClick(p)} style={{ left: `${98 + i * 20}px`, top: '53px', width: '21px', height: '188px', backgroundColor: s ? '#D1FAE5' : '#E2E8F0', borderColor: s ? '#10B981' : '#CBD5E1', color: s ? '#047857' : '#475569', cursor, opacity }} className="absolute text-[7px] font-bold border border-slate-400 rounded-sm transition-all duration-150">{n}</button>; })}

      {Array.from({ length: 4 }, (_, i) => { const n = (i + 1).toString().padStart(2, '0'); const p = `23${n}`; const s = esSeleccionada(p); return <button key={p} onClick={() => onClick(p)} style={{ left: `${262 + i * 20}px`, top: '53px', width: '21px', height: '188px', backgroundColor: s ? '#D1FAE5' : '#E2E8F0', borderColor: s ? '#10B981' : '#CBD5E1', color: s ? '#047857' : '#475569', cursor, opacity }} className="absolute text-[7px] font-bold border border-slate-400 rounded-sm transition-all duration-150">{n}</button>; })}

      {/* Labels */}
      <div className="absolute text-[6px] font-bold text-emerald-700" style={{ left: '72px', top: '56px', writingMode: 'vertical-rl', height: '82px' }}>MÓDULO 1</div>
      <div className="absolute text-[6px] font-bold text-emerald-700" style={{ left: '238px', top: '55px', writingMode: 'vertical-rl', height: '82px' }}>MÓDULO 2</div>
      <div className="absolute text-[6px] font-bold text-emerald-700" style={{ left: '342px', top: '54px', writingMode: 'vertical-rl', height: '82px' }}>MÓDULO 3</div>
      <button className="absolute text-[5.5px] font-bold border border-slate-400 bg-slate-200 rounded-sm" style={{ left: '97px', top: '274px', width: '244px', height: '15px' }}>2P01</button>
      <div className="absolute border border-slate-300 text-[6px] font-bold text-center text-slate-600 bg-slate-100 rounded-sm" style={{ left: '98px', top: '241px', width: '138px', height: '13px' }}>NIVEL A B</div>
      <div className="absolute border border-slate-300 text-[6px] font-bold text-center text-slate-600 bg-slate-100 rounded-sm" style={{ left: '262px', top: '241px', width: '38px', height: '23px', lineHeight: '10px' }}>NIVEL A B</div>
      <div className="absolute border border-slate-300 text-[6px] font-bold text-center text-slate-600 bg-slate-100 rounded-sm" style={{ left: '302px', top: '241px', width: '38px', height: '23px', lineHeight: '10px' }}>NIVEL A B C</div>
    </div>
  );
}

// ====================== PANEL 4 ======================
function Panel4() {
  return (
    <div className="absolute border border-slate-300 overflow-hidden rounded" style={{ left: '301px', top: '3px', width: '484px', height: '344px', backgroundColor: '#F8FAFC' }}>
      {/* Placeholder - se sobrescribe en ModalLocalizacion */}
    </div>
  );
}

// ====================== PANEL 5 ======================
function Panel5({ highlight, esSeleccionada, onClick, cursor, opacity }: any) {
  return (
    <div className="absolute border border-slate-300 rounded" style={{ left: '667px', top: '350px', width: '117px', height: '293px', backgroundColor: '#F8FAFC' }}>
      <div className="absolute text-xs font-normal text-emerald-700 font-semibold" style={{ left: '42px', top: '60px', writingMode: 'vertical-rl', height: '168px' }}>MÓDULO 1</div>
      <div className="absolute border border-slate-300 text-[6px] font-bold text-slate-600 bg-slate-100 rounded-sm" style={{ left: '75px', top: '11px', width: '13px', height: '173px', writingMode: 'vertical-rl' }}>NIVEL   ABC</div>
      <div className="absolute border border-slate-300 text-[6px] font-bold text-slate-600 bg-slate-100 rounded-sm" style={{ left: '75px', top: '186px', width: '13px', height: '100px', writingMode: 'vertical-rl' }}>NIVEL   ABCD</div>

      {Array.from({ length: 11 }, (_, i) => {
        const num = (11 - i).toString().padStart(2, '0');
        const pos = `41${num}`;
        const sel = esSeleccionada(pos);
        return <button key={pos} onClick={() => onClick(pos)} style={{ right: '5px', top: `${10 + i * 25}px`, width: '23px', height: '26px', backgroundColor: sel ? '#D1FAE5' : '#E2E8F0', borderColor: sel ? '#10B981' : '#CBD5E1', color: sel ? '#047857' : '#475569', cursor, opacity }} className="absolute text-[5.5px] font-bold border border-slate-400 rounded-sm transition-all duration-150">{num}</button>;
      })}
    </div>
  );
}
