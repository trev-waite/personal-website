import { Component, AfterViewInit, OnDestroy, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as THREE from 'three';

@Component({
  selector: 'app-racing-game',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './racing-game.component.html',
  styleUrls: ['./racing-game.component.scss']
})
export class RacingGameComponent implements AfterViewInit, OnDestroy {
  @ViewChild('gameContainer') gameContainer!: ElementRef;

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private car!: THREE.Group;
  private track!: THREE.Mesh;
  private trackRadius: number = 30;
  private trackWidth: number = 8;
  private obstacles: THREE.Mesh[] = [];
  private keysPressed: { [key: string]: boolean } = {};

  ngAfterViewInit() {
    // Add small timeout to ensure DOM is ready
    setTimeout(() => {
      // Force a layout reflow
      this.gameContainer.nativeElement.getBoundingClientRect();
      this.initThree();
      this.animate();
    }, 100);
  }

  private createCar(): THREE.Group {
    const car = new THREE.Group();

    // Main body - reduced dimensions
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.3, 2),  // reduced from (2, 0.5, 4)
      new THREE.MeshPhongMaterial({ color: 0x00ff00 })
    );
    body.position.y = 0.3;  // adjusted for new height
    car.add(body);

    // Cabin - reduced dimensions
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.3, 1),  // reduced from (1.5, 0.5, 2)
      new THREE.MeshPhongMaterial({ color: 0x333333 })
    );
    cabin.position.y = 0.6;  // adjusted for new height
    cabin.position.z = -0.3;  // adjusted for new length
    car.add(cabin);

    // Wheels - reduced dimensions
    const wheelGeometry = new THREE.CylinderGeometry(0.25, 0.25, 0.2, 32);  // reduced from (0.4, 0.4, 0.4)
    const wheelMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
    
    const wheels = [
      { x: -0.7, z: 0.7 },   // adjusted positions for smaller car
      { x: 0.7, z: 0.7 },
      { x: -0.7, z: -0.7 },
      { x: 0.7, z: -0.7 }
    ];

    wheels.forEach(pos => {
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(pos.x, 0.25, pos.z);  // adjusted height
      car.add(wheel);
    });

    return car;
  }

  private createF1Track() {
    // Create complex track shape
    const trackShape = new THREE.Shape();
    const trackPoints = [
      { x: 0, y: 0 },
      { x: 30, y: 0 },
      { x: 40, y: 20 },
      { x: 30, y: 40 },
      { x: 0, y: 45 },
      { x: -20, y: 35 },
      { x: -30, y: 15 },
      { x: -20, y: 0 },
      { x: 0, y: 0 }
    ];

    trackShape.moveTo(trackPoints[0].x, trackPoints[0].y);
    trackShape.bezierCurveTo(
      trackPoints[1].x, trackPoints[1].y,
      trackPoints[2].x, trackPoints[2].y,
      trackPoints[3].x, trackPoints[3].y
    );
    trackShape.bezierCurveTo(
      trackPoints[4].x, trackPoints[4].y,
      trackPoints[5].x, trackPoints[5].y,
      trackPoints[6].x, trackPoints[6].y
    );
    trackShape.bezierCurveTo(
      trackPoints[7].x, trackPoints[7].y,
      trackPoints[8].x, trackPoints[8].y,
      trackPoints[0].x, trackPoints[0].y
    );

    // Create inner track curve
    const innerTrackShape = new THREE.Shape();
    const scale = 0.7; // Scale factor for inner track
    const innerPoints = trackPoints.map(p => ({ x: p.x * scale, y: p.y * scale }));
    
    innerTrackShape.moveTo(innerPoints[0].x, innerPoints[0].y);
    innerTrackShape.bezierCurveTo(
      innerPoints[1].x, innerPoints[1].y,
      innerPoints[2].x, innerPoints[2].y,
      innerPoints[3].x, innerPoints[3].y
    );
    innerTrackShape.bezierCurveTo(
      innerPoints[4].x, innerPoints[4].y,
      innerPoints[5].x, innerPoints[5].y,
      innerPoints[6].x, innerPoints[6].y
    );
    innerTrackShape.bezierCurveTo(
      innerPoints[7].x, innerPoints[7].y,
      innerPoints[8].x, innerPoints[8].y,
      innerPoints[0].x, innerPoints[0].y
    );

    trackShape.holes.push(innerTrackShape);

    const geometry = new THREE.ShapeGeometry(trackShape);
    const material = new THREE.MeshPhongMaterial({ 
      color: 0x333333,
      side: THREE.DoubleSide 
    });

    this.track = new THREE.Mesh(geometry, material);
    this.track.rotation.x = -Math.PI / 2;
    this.scene.add(this.track);
  }

  private createSky() {
    // Create sky sphere
    const skyGeometry = new THREE.SphereGeometry(500, 32, 32);
    const skyMaterial = new THREE.MeshBasicMaterial({
      color: 0x87CEEB, // Sky blue
      side: THREE.BackSide
    });
    const sky = new THREE.Mesh(skyGeometry, skyMaterial);
    this.scene.add(sky);

    // Add clouds
    const cloudGeometry = new THREE.SphereGeometry(5, 16, 16);
    const cloudMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });
    
    for (let i = 0; i < 20; i++) {
      const cloud = new THREE.Mesh(cloudGeometry, cloudMaterial);
      cloud.position.set(
        Math.random() * 400 - 200,
        Math.random() * 50 + 50,
        Math.random() * 400 - 200
      );
      cloud.scale.set(
        Math.random() * 2 + 1,
        0.5,
        Math.random() * 2 + 1
      );
      this.scene.add(cloud);
    }
  }

  private initThree() {
    const container = this.gameContainer.nativeElement;
    
    // Force container dimensions before initialization
    container.style.width = '100vw';
    container.style.height = '100vh';

    // Initialize scene
    this.scene = new THREE.Scene();

    // Initialize camera
    this.camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    this.camera.position.set(0, 2, 5);

    // Initialize renderer
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.renderer.domElement);

    // Create better lighting
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(100, 100, 100);
    this.scene.add(directionalLight);

    const ambientLight = new THREE.AmbientLight(0x404040);
    this.scene.add(ambientLight);

    // Create ground
    const groundGeometry = new THREE.PlaneGeometry(200, 200);
    const groundMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x1a472a,  // Dark green for grass
      side: THREE.DoubleSide
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.1;
    this.scene.add(ground);

    // Add sky and clouds
    this.createSky();

    // Replace old track creation with new F1 track
    this.createF1Track();

    // Update car starting position
    this.car = this.createCar();
    this.car.position.set(0, 0.5, 0);
    this.scene.add(this.car);

    // Adjust camera position for better view
    this.camera.position.set(0, 20, 30);
    this.camera.lookAt(0, 0, 0);

    // Create obstacles (red boxes)
    const obstacleGeometry = new THREE.BoxGeometry(1, 1, 1);
    const obstacleMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000 });
    for (let i = 0; i < 10; i++) {
      const obstacle = new THREE.Mesh(obstacleGeometry, obstacleMaterial);
      obstacle.position.set(
        Math.random() * 50 - 25, // Random x between -25 and 25
        0.5,                    // Same height as car
        Math.random() * 50 - 25 // Random z between -25 and 25
      );
      this.scene.add(obstacle);
      this.obstacles.push(obstacle);
    }
  }

  private isCarOnTrack(): boolean {
    // Update track boundary check for new track shape
    const carPosition = this.car.position;
    // Simplified check - you might want to implement a more precise boundary check
    const maxDistance = 45; // Maximum distance from center based on track size
    const distanceFromCenter = Math.sqrt(carPosition.x * carPosition.x + carPosition.z * carPosition.z);
    return distanceFromCenter < maxDistance;
  }

  private animate() {
    requestAnimationFrame(() => this.animate());

    const speed = 0.1;
    const turnSpeed = 0.05;

    // Handle turning
    if (this.keysPressed['ArrowLeft']) {
      this.car.rotation.y += turnSpeed; // Turn left
    }
    if (this.keysPressed['ArrowRight']) {
      this.car.rotation.y -= turnSpeed; // Turn right
    }

    // Handle movement
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.car.quaternion);
    if (this.keysPressed['ArrowUp']) {
      this.car.position.add(forward.clone().multiplyScalar(speed)); // Move forward
    }
    if (this.keysPressed['ArrowDown']) {
      this.car.position.add(forward.clone().multiplyScalar(-speed)); // Move backward
    }

    // Update camera to follow car
    this.camera.position.copy(this.car.position).add(
      new THREE.Vector3(0, 2, 5).applyQuaternion(this.car.quaternion)
    );
    this.camera.lookAt(this.car.position);

    // Check collisions with obstacles
    for (const obstacle of this.obstacles) {
      if (
        Math.abs(this.car.position.x - obstacle.position.x) < 1 &&
        Math.abs(this.car.position.z - obstacle.position.z) < 1
      ) {
        console.log('Collision detected!');
        this.car.position.set(0, 0.5, 0); // Reset to starting position
      }
    }

    // Add track boundary check
    if (!this.isCarOnTrack()) {
      this.car.position.set(this.trackRadius, 0.5, 0);
      this.car.rotation.y = 0;
    }

    // Render the scene
    this.renderer.render(this.scene, this.camera);
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    this.keysPressed[event.key] = true;
  }

  @HostListener('window:keyup', ['$event'])
  onKeyUp(event: KeyboardEvent) {
    this.keysPressed[event.key] = false;
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: Event) {
    const container = this.gameContainer.nativeElement;
    this.camera.aspect = container.clientWidth / container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(container.clientWidth, container.clientHeight);
  }

  ngOnDestroy() {
    this.renderer.dispose(); // Clean up renderer resources
  }
}