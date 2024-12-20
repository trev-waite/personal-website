import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { HomeRoutingModule } from './home-routing.module';
import { HomePageComponent } from './homePageComponent/home-page.component';



@NgModule({ declarations: [
        HomePageComponent
    ],
    schemas: [CUSTOM_ELEMENTS_SCHEMA], imports: [CommonModule,
        MatIconModule,
        MatButtonModule,
        HomeRoutingModule], providers: [provideHttpClient(withInterceptorsFromDi())] })
export class HomeModuleModule { }
