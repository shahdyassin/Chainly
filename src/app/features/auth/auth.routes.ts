import { Routes } from '@angular/router';
import { ForgetPassword } from './pages/forget-password/forget-password';
import { OtpVerify } from './pages/otp-verify/otp-verify';
import { ResetPassword } from './pages/reset-password/reset-password';
import { RegisterStep1Role } from './pages/register/register-step1-role/register-step1-role';
import { RegisterStep2Personal } from './pages/register/register-step2-personal/register-step2-personal';
import { RegisterStep3Photo } from './pages/register/register-step3-photo/register-step3-photo';
import { RegisterStep4Password } from './pages/register/register-step4-password/register-step4-password';
import { RegisterStep5EmailConfirm } from './pages/register/register-step5-email-confirm/register-step5-email-confirm';
import { Login } from './pages/login/login';

export const AUTH_ROUTES: Routes = [
  { path: 'login', component: Login },


  { path: 'register-step1-role', component: RegisterStep1Role },
  { path: 'register-step2-personal', component: RegisterStep2Personal },
  { path: 'register-step3-photo', component: RegisterStep3Photo },
  { path: 'register-step4-password', component: RegisterStep4Password },
  { path: 'register-step5-email-confirm', component: RegisterStep5EmailConfirm },

  
  { path: 'register', pathMatch: 'full', redirectTo: 'register-step1-role' },

  { path: 'forget-password', component: ForgetPassword },
  { path: 'otp-verify', component: OtpVerify },
  { path: 'reset-password', component: ResetPassword },
];
