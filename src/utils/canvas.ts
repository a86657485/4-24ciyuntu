interface Word {
  text: string;
  size: number;
}

export const drawWordCloud = (
  canvas: HTMLCanvasElement, 
  words: {text: string, count: number}[]
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  const width = canvas.width;
  const height = canvas.height;
  
  ctx.clearRect(0, 0, width, height);
  
  // Sort by count descending
  const sorted = [...words].sort((a, b) => b.count - a.count);
  const maxCount = sorted.length > 0 ? sorted[0].count : 1;
  const minCount = sorted.length > 0 ? sorted[sorted.length-1].count : 0;
  
  const mapSize = (count: number) => {
    const minSize = 16;
    const maxSize = 120;
    if (maxCount === minCount) return maxSize;
    return Math.round(minSize + ((count - minCount) / (maxCount - minCount)) * (maxSize - minSize));
  };
  
  const colors = ['#FFD700', '#F0EAD6', '#1ABC9C', '#FF8C00', '#C0392B', '#9b59b6'];
  const drawnWords: {x: number, y: number, w: number, h: number}[] = [];
  
  const checkCollision = (x: number, y: number, w: number, h: number) => {
    return drawnWords.some(dw => {
      // simple AABB collision with a little padding
      return x < dw.x + dw.w + 5 &&
             x + w + 5 > dw.x &&
             y - h - 5 < dw.y &&
             y > dw.y - dw.h - 5;
    });
  };
  
  // Archimedean spiral
  const a = 5;
  const b = 5;
  
  let delay = 0;
  
  sorted.forEach((wordObj, i) => {
    const size = mapSize(wordObj.count);
    const text = wordObj.text;
    ctx.font = `bold ${size}px sans-serif`;
    
    // basic metrics
    const w = ctx.measureText(text).width;
    const h = size * 0.8;
    
    let angle = 0;
    let x = 0, y = 0;
    let placed = false;
    
    while (!placed && angle < Math.PI * 2 * 100) { // max 100 loops
      const r = a + b * angle;
      x = width / 2 + r * Math.cos(angle) - w / 2;
      y = height / 2 + r * Math.sin(angle) + h / 2;
      
      if (!checkCollision(x, y, w, h)) {
        placed = true;
        drawnWords.push({ x, y, w, h });
        
        // Use timeout for staggered animation
        setTimeout(() => {
          ctx.save();
          const centerX = x + w / 2;
          const centerY = y - h / 2;
          ctx.translate(centerX, centerY);
          // random slight rotation (-15 to 15 degrees)
          ctx.rotate((Math.random() - 0.5) * 0.5);
          ctx.translate(-centerX, -centerY);
          
          ctx.fillStyle = colors[i % colors.length];
          ctx.font = `bold ${size}px sans-serif`;
          ctx.shadowColor = 'rgba(0,0,0,0.5)';
          ctx.shadowBlur = 4;
          ctx.fillText(text, x, y);
          ctx.restore();
        }, delay);
        delay += 150;
      }
      
      angle += 0.2;
    }
  });

  return delay; // return total animation duration
};
