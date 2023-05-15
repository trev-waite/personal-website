import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';

@Component({
  selector: 'app-home-page',
  templateUrl: './home-page.component.html',
  styleUrls: ['./home-page.component.scss']
})
export class HomePageComponent implements OnInit {

@ViewChild('buttonDiv', {static: false}) 
private buttonDiv!: ElementRef<HTMLDivElement>;
  
public isTestButtonScrolledIntoView = false;

public ngOnInit(): void {
    console.log(`
     ______
    / |_||__ \\ \`.__
   (      _      _ __\\
   =\`-(_)--(_)-'  Frooooom
   
   
   
   Art by Hayley Jane Wakenshaw`);
}

  @HostListener('window:scroll', ['$event'])
  isScrolledIntoView(){
    if (this.buttonDiv){
      const rect = this.buttonDiv.nativeElement.getBoundingClientRect();
      const topShown = rect.top >= 0;
      this.isTestButtonScrolledIntoView = topShown;
    }
  }
}
