import { Component, ElementRef, ViewChild, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-smiley',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="smiley-face">
      <div class="eye left-eye" #leftEye>
        <div class="pupil" [style.transform]="leftPupilTransform"></div>
      </div>
      <div class="eye right-eye" #rightEye>
        <div class="pupil" [style.transform]="rightPupilTransform"></div>
      </div>
    </div>
  `,
  styleUrls: ['./smiley.component.scss']
})
export class SmileyComponent {
  @ViewChild('leftEye') leftEye!: ElementRef;
  @ViewChild('rightEye') rightEye!: ElementRef;
  leftPupilTransform: string = '';
  rightPupilTransform: string = '';

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    if (this.leftEye && this.rightEye) {
      const leftEyeRect = this.leftEye.nativeElement.getBoundingClientRect();
      const rightEyeRect = this.rightEye.nativeElement.getBoundingClientRect();

      const leftEyeCenterX = leftEyeRect.left + leftEyeRect.width / 2;
      const leftEyeCenterY = leftEyeRect.top + leftEyeRect.height / 2;
      const rightEyeCenterX = rightEyeRect.left + rightEyeRect.width / 2;
      const rightEyeCenterY = rightEyeRect.top + rightEyeRect.height / 2;

      const leftAngle = Math.atan2(event.clientY - leftEyeCenterY, event.clientX - leftEyeCenterX);
      const rightAngle = Math.atan2(event.clientY - rightEyeCenterY, event.clientX - rightEyeCenterX);

      const pupilDistance = 5;

      const leftPupilX = pupilDistance * Math.cos(leftAngle);
      const leftPupilY = pupilDistance * Math.sin(leftAngle);
      const rightPupilX = pupilDistance * Math.cos(rightAngle);
      const rightPupilY = pupilDistance * Math.sin(rightAngle);

      this.leftPupilTransform = `translate(${leftPupilX}px, ${leftPupilY}px)`;
      this.rightPupilTransform = `translate(${rightPupilX}px, ${rightPupilY}px)`;
    }
  }
}
