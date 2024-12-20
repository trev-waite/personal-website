import { Component } from '@angular/core';
import { DRIVER_NAMES } from './constants/driver-names.constants';

@Component({
    selector: 'app-f1-data',
    templateUrl: './f1-data.component.html',
    styleUrls: ['./f1-data.component.scss'],
    standalone: false
})
export class F1DataComponent {

  public driverNames = DRIVER_NAMES;

}
