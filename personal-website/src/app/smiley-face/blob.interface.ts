export interface Blob {
    id: number;
    x: number;
    y: number;
    size: number;
    velocityX: number;
    velocityY: number;
    squish: number; // 1 is normal, <1 is squished
    radius: number;  // Added for collision detection
  }