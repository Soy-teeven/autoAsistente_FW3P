import { Piece, WearStatus, TrafficLight } from '../types';

// Calcula el desgaste de una pieza y determina su estado en el semáforo (Verde / Amarillo / Rojo)
export const calculatePieceWear = (
  piece: Piece, 
  currentVehicleKm: number, 
  currentDate: string = new Date().toISOString()
): WearStatus => {
  const safeLifeKm = piece.lifeKm > 0 ? piece.lifeKm : 10000;
  const safeLifeMonths = piece.lifeMonths > 0 ? piece.lifeMonths : 12;

  // Calcula el porcentaje de desgaste por kilometraje recorrido
  const kmDrivenSinceChange = Math.max(0, currentVehicleKm - piece.lastChangeKm);
  const wearKmPercent = (kmDrivenSinceChange / safeLifeKm) * 100;
  const remainingKm = Math.max(0, safeLifeKm - kmDrivenSinceChange);

  // Calcula el porcentaje de desgaste por meses transcurridos
  const lastDate = new Date(piece.lastChangeDate || currentDate);
  const currDate = new Date(currentDate);
  const diffMonths = (currDate.getFullYear() - lastDate.getFullYear()) * 12 + (currDate.getMonth() - lastDate.getMonth());
  const wearMonthsPercent = (Math.max(0, diffMonths) / safeLifeMonths) * 100;

  // Toma el desgaste mayor entre tiempo y kilometraje
  const rawMax = Math.max(wearKmPercent, wearMonthsPercent);
  const currentLifePercent = Math.round(Math.max(0, Math.min(100, isNaN(rawMax) ? 0 : rawMax)));

  // Determina el estado del semáforo según el desgaste (Verde <75%, Amarillo 75-89%, Rojo >=90%)
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