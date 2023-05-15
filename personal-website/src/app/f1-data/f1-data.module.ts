import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { F1DataRoutingModule } from './f1-data-routing.module';
import { F1DataComponent } from './f1DataComponent/f1-data.component';


@NgModule({
  declarations: [
    F1DataComponent
  ],
  imports: [
    CommonModule,
    F1DataRoutingModule
  ]
})
export class F1DataModule { }
