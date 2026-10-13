import { formatSqmForPdf } from './formatSqmForPdf.js';

export function formatItemSqmForPdf(item) {
  if (!item || typeof item !== 'object') {
    return item;
  }
  return {
    ...item,
    sqm: formatSqmForPdf(item.sqm),
  };
}

export function formatItemsSqmForPdf(items = []) {
  return items.map(formatItemSqmForPdf);
}

export function formatGroupedSeriesSqmForPdf(groupedSeries = []) {
  return groupedSeries.map((group) => ({
    ...group,
    items: formatItemsSqmForPdf(group.items),
  }));
}

export function computeTotalSqMtrForPdf(items = []) {
  const total = items.reduce(
    (sum, item) => sum + (Number(item?.sqm) || 0),
    0
  );
  return formatSqmForPdf(total);
}
