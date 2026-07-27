import { Piece, WearStatus, TrafficLight } from '../types';

/**
 * Motor predictivo de desgaste y semáforo tricolor (RF08, RF09, RNF02)
 * Cumple con la fórmula ERS: currentLifePercent = Max(wearKmPercent, wearMonthsPercent)
 */
export const calculatePieceWear = (
  piece: Piece, 
  currentVehicleKm: number, 
  currentDate: string = new Date().toISOString()
): WearStatus => {
  const safeLifeKm = piece.lifeKm > 0 ? piece.lifeKm : 10000;
  const safeLifeMonths = piece.lifeMonths > 0 ? piece.lifeMonths : 12;

  // 1. Desgaste por Kilometraje
  const kmDrivenSinceChange = Math.max(0, currentVehicleKm - piece.lastChangeKm);
  const wearKmPercent = (kmDrivenSinceChange / safeLifeKm) * 100;
  const remainingKm = Math.max(0, safeLifeKm - kmDrivenSinceChange);

  // 2. Desgaste por Tiempo en Meses
  const lastDate = new Date(piece.lastChangeDate || currentDate);
  const currDate = new Date(currentDate);
  const diffMonths = (currDate.getFullYear() - lastDate.getFullYear()) * 12 + (currDate.getMonth() - lastDate.getMonth());
  const wearMonthsPercent = (Math.max(0, diffMonths) / safeLifeMonths) * 100;

  // 3. Selección del máximo desgaste (RF08)
  const rawMax = Math.max(wearKmPercent, wearMonthsPercent);
  const currentLifePercent = Math.round(Math.max(0, Math.min(100, isNaN(rawMax) ? 0 : rawMax)));

  // 4. Asignación de Semáforo Tricolor (Green <75%, Yellow 75-89%, Red >=90%)
  let status: TrafficLight = 'green';
  let statusLabel: 'Óptimo' | 'Precaución' | 'Crítico' = 'Óptimo';

  if (currentLifePercent >= 90) {
    status = 'red';
    statusLabel = 'Crítico';
  } else if (currentLifePercent >= 75) {
    status = 'yellow';
    statusLabel = 'Precaución';
  }

  return {
    pieceId: piece.id,
    wearKmPercent: Math.round(wearKmPercent),
    wearMonthsPercent: Math.round(wearMonthsPercent),
    currentLifePercent,
    status,
    statusLabel,
    remainingKm,
    kmDrivenSinceChange
  };
};