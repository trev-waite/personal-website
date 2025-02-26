import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SmileyComponent } from './face/smiley.component';
import { Blob } from './blob.interface';

@Component({
  selector: 'app-blob-stuff',
  standalone: true,
  imports: [CommonModule, SmileyComponent],
  template: `
    <div class="container">
      <app-smiley></app-smiley>
      <div class="square">
        <div *ngFor="let blob of blobs"
             class="blob"
             [style.left.px]="blob.x - blob.size / 2"
             [style.top.px]="blob.y - blob.size / 2"
             [style.width.px]="blob.size"
             [style.height.px]="blob.size"
             [style.transform]="'scale(' + (1/blob.squish) + ',' + blob.squish + ')'"
             (click)="splitBlob(blob.id)">
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./blob-stuff.component.scss']
})
export class BlobStuffComponent {
  // Blob state management
  blobs: Blob[] = [];
  nextBlobId: number = 0;
  private readonly CURSOR_INFLUENCE = 100;
  private readonly REPEL_FORCE = 0.5;
  private readonly DAMPING = 0.98;
  private readonly COLLISION_DAMPING = 0.6;
  private animationFrameId: number = 0;
  mouseX: number = 0;
  mouseY: number = 0;

  constructor() {
    this.blobs.push({ 
      id: this.nextBlobId++, 
      x: 125, 
      y: 125, 
      size: 50,
      radius: 25,
      velocityX: 0,
      velocityY: 0,
      squish: 1
    });
    this.startAnimation();
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.animationFrameId);
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    this.mouseX = event.clientX;
    this.mouseY = event.clientY;
  }

  private startAnimation() {
    const animate = () => {
      this.updateBlobPositions();
      this.animationFrameId = requestAnimationFrame(animate);
    };
    animate();
  }

  private updateBlobPositions() {
    const square = document.querySelector('.square')?.getBoundingClientRect();
    if (!square) return;

    this.blobs.forEach(blob => {
      // Calculate distance from cursor
      const dx = this.mouseX - (square.left + blob.x);
      const dy = this.mouseY - (square.top + blob.y);
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Repel if cursor is close
      if (distance < this.CURSOR_INFLUENCE) {
        const force = (this.CURSOR_INFLUENCE - distance) / this.CURSOR_INFLUENCE;
        blob.velocityX -= (dx / distance) * force * this.REPEL_FORCE;
        blob.velocityY -= (dy / distance) * force * this.REPEL_FORCE;
      }

      // Check collisions with other blobs
      this.blobs.forEach(otherBlob => {
        if (blob.id !== otherBlob.id) {
          this.handleBlobCollision(blob, otherBlob);
        }
      });

      // Update position
      blob.x += blob.velocityX;
      blob.y += blob.velocityY;

      // Apply damping
      blob.velocityX *= this.DAMPING;
      blob.velocityY *= this.DAMPING;

      // Boundary collision with squish effect
      const margin = blob.size / 2;
      if (blob.x < margin) {
        blob.x = margin;
        blob.velocityX *= -0.5;
        blob.squish = 0.8;
      } else if (blob.x > 250 - margin) {
        blob.x = 250 - margin;
        blob.velocityX *= -0.5;
        blob.squish = 0.8;
      }
      
      if (blob.y < margin) {
        blob.y = margin;
        blob.velocityY *= -0.5;
        blob.squish = 0.8;
      } else if (blob.y > 250 - margin) {
        blob.y = 250 - margin;
        blob.velocityY *= -0.5;
        blob.squish = 0.8;
      }

      // Recover from squish
      blob.squish += (1 - blob.squish) * 0.1;
    });
  }

  private handleBlobCollision(blob1: Blob, blob2: Blob) {
    const dx = blob2.x - blob1.x;
    const dy = blob2.y - blob1.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const minDistance = blob1.radius + blob2.radius;

    if (distance < minDistance) {
      // Calculate collision response
      const angle = Math.atan2(dy, dx);
      const targetX = blob1.x + Math.cos(angle) * minDistance;
      const targetY = blob1.y + Math.sin(angle) * minDistance;

      // Move blobs apart
      const ax = (targetX - blob2.x) * this.COLLISION_DAMPING;
      const ay = (targetY - blob2.y) * this.COLLISION_DAMPING;

      // Update velocities
      blob1.velocityX -= ax;
      blob1.velocityY -= ay;
      blob2.velocityX += ax;
      blob2.velocityY += ay;

      // Apply squish effect
      const collisionForce = 1 - (distance / minDistance);
      blob1.squish = 1 - (collisionForce * 0.2);
      blob2.squish = 1 - (collisionForce * 0.2);
    }
  }

  // Split a blob into two smaller blobs
  splitBlob(id: number) {
    const index = this.blobs.findIndex(blob => blob.id === id);
    if (index !== -1) {
      const blob = this.blobs[index];
      const newSize = blob.size * 0.7; // Reduce size for new blobs
      const angle = Math.random() * 2 * Math.PI; // Random angle for splitting
      const distance = blob.size / 2; // Distance to offset new blobs

      // Calculate new positions
      let newX1 = blob.x + distance * Math.cos(angle);
      let newY1 = blob.y + distance * Math.sin(angle);
      let newX2 = blob.x - distance * Math.cos(angle);
      let newY2 = blob.y - distance * Math.sin(angle);

      // Clamp positions within the square (200x200)
      const minX = newSize / 2;
      const maxX = 200 - newSize / 2;
      const minY = newSize / 2;
      const maxY = 200 - newSize / 2;

      newX1 = Math.max(minX, Math.min(maxX, newX1));
      newY1 = Math.max(minY, Math.min(maxY, newY1));
      newX2 = Math.max(minX, Math.min(maxX, newX2));
      newY2 = Math.max(minY, Math.min(maxY, newY2));

      // Create new blobs
      const newBlob1: Blob = { 
        id: this.nextBlobId++, 
        x: newX1, 
        y: newY1, 
        size: newSize,
        radius: newSize/2,
        velocityX: 0, 
        velocityY: 0, 
        squish: 1 
      };
      const newBlob2: Blob = { 
        id: this.nextBlobId++, 
        x: newX2, 
        y: newY2, 
        size: newSize,
        radius: newSize/2,
        velocityX: 0, 
        velocityY: 0, 
        squish: 1 
      };

      // Remove original blob and add new ones
      this.blobs.splice(index, 1);
      this.blobs.push(newBlob1, newBlob2);
    }
  }
}
