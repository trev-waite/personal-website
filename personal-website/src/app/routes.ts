import { Routes } from "@angular/router";

export const routes: Routes = [{
    path: '',
    loadChildren: () => import('./home-page/home-module.module').then(m => m.HomeModuleModule)
},
{
    path: 'f1-data',
    loadChildren: () => import('./f1-data/f1-data.module').then(m => m.F1DataModule)
},
{
    path: '**', redirectTo: '',
}];