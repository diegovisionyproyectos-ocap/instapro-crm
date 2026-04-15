import type { PhaseType } from './types';

export const DEFAULT_CHECKLIST: Record<PhaseType, string[]> = {
  pre_production: [
    'Compra de materiales',
    'Asignar instalador responsable',
    'Revisar planos y especificaciones',
    'Coordinar fecha de inicio con cliente',
    'Confirmar transporte y logística',
    'Verificar permisos y documentación',
  ],
  production: [
    'Preparación y llegada al sitio',
    'Ejecución de la instalación',
    'Pruebas de funcionamiento',
    'Ajustes y correcciones finales',
    'Firma de conformidad del cliente',
  ],
  post_production: [
    'Entrega de documentación técnica',
    'Emitir factura al cliente',
    'Confirmar cobro',
    'Seguimiento post-instalación (30 días)',
    'Cierre de expediente',
  ],
};

export const PHASE_LABELS: Record<PhaseType, string> = {
  pre_production: 'Pre-producción',
  production: 'Producción',
  post_production: 'Post-producción',
};

export const PHASE_ORDER: PhaseType[] = ['pre_production', 'production', 'post_production'];
