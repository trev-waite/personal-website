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
    path: 'smiley-face',
    loadComponent: () => import('./smiley-face/blob-stuff.component').then(m => m.BlobStuffComponent)
},
{
    path: 'racing-game',
    loadComponent: () => import('./racing-game/racing-game.component').then(m => m.RacingGameComponent)
},
{
    path: 'ai-chat',
    loadComponent: () => import('./ai-chat/ai-chat.component').then(m => m.AiChatComponent)
},
{
    path: '**', redirectTo: '',
}];