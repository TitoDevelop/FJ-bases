import {inject} from '@angular/core';
import {CanActivateFn,Routes,Router} from '@angular/router';
import {DataService} from './data.service';
import {AppComponent} from './app.component';
export const adminGuard:CanActivateFn=async()=>{const data=inject(DataService);const router=inject(Router);await data.currentUserReady();return await data.isAdmin()||router.createUrlTree(['/'],{queryParams:{login:'1'}});};
export const routes:Routes=[{path:'admin',component:AppComponent,canActivate:[adminGuard]},{path:'',component:AppComponent,pathMatch:'full'},{path:'**',redirectTo:''}];
