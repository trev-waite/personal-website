import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { F1DataComponent } from './f1DataComponent/f1-data.component';

const routes: Routes = [{
  path: '',
  component: F1DataComponent
}];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class F1DataRoutingModule { }
