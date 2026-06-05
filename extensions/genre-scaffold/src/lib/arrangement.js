export function buildArrangement(template, totalBars) {
  const bars = Math.max(4, Math.floor(Number(totalBars) || 16));
  const minimums = template.map((section) => Math.max(0, section.minBars ?? 1));
  const minimumTotal = minimums.reduce((sum, value) => sum + value, 0);

  if (minimumTotal > bars) {
    throw new Error(`Arrangement needs at least ${minimumTotal} bars for this template.`);
  }

  const remainingBars = bars - minimumTotal;
  const totalWeight = template.reduce((sum, section) => sum + section.weight, 0);
  const allocations = [...minimums];
  const remainders = template.map((section, index) => {
    const exact = remainingBars * (section.weight / totalWeight);
    const whole = Math.floor(exact);
    allocations[index] += whole;
    return { index, remainder: exact - whole };
  });

  let undistributed = bars - allocations.reduce((sum, value) => sum + value, 0);
  for (const item of remainders.sort((a, b) => b.remainder - a.remainder)) {
    if (undistributed <= 0) {
      break;
    }
    allocations[item.index] += 1;
    undistributed -= 1;
  }

  let startBar = 0;
  return template.map((section, index) => {
    const arranged = {
      index,
      name: section.name,
      startBar,
      bars: allocations[index],
      endBar: startBar + allocations[index],
      energy: section.energy,
      tags: section.tags ?? []
    };
    startBar = arranged.endBar;
    return arranged;
  });
}

export function optionFactor(value, table, fallback = 1) {
  return table[value] ?? fallback;
}
