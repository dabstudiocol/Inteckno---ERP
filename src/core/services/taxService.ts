/** Tasa de IVA/VAT general por país de ejecución del proyecto (Regla 8). */
const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

export function getProjectTaxRate(country?: string): { rate: number; label: string; countryName: string } {
  const norm = normalize(country || '');
  const table: [string, number, string][] = [
    ['colombia', 0.19, 'Colombia'],
    ['mexico', 0.16, 'México'],
    ['chile', 0.19, 'Chile'],
    ['peru', 0.18, 'Perú'],
    ['bolivia', 0.13, 'Bolivia'],
    ['ecuador', 0.15, 'Ecuador'],
    ['espana', 0.21, 'España'],
    ['panama', 0.07, 'Panamá'],
    ['dominicana', 0.18, 'Rep. Dominicana'],
    ['costa rica', 0.13, 'Costa Rica'],
    ['guatemala', 0.12, 'Guatemala'],
    ['argentina', 0.21, 'Argentina'],
  ];
  for (const [key, rate, name] of table) {
    if (norm.includes(key)) return { rate, label: `${Math.round(rate * 100)}%`, countryName: name };
  }
  // Default estándar (Inteckno Colombia)
  return { rate: 0.19, label: '19%', countryName: country || 'Colombia' };
}
