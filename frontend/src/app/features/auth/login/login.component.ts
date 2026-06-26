import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, TranslateModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private translate = inject(TranslateService);
  private slideInterval?: ReturnType<typeof setInterval>;
  private tipInterval?: ReturnType<typeof setInterval>;
  private tipIndex = 0;

  readonly slides = [
    '/assets/images/login/img1.jpg',
    '/assets/images/login/img2.jpg',
    '/assets/images/login/img3.jpg',
    '/assets/images/login/img4.jpg',
  ];
  currentSlide = signal(0);

  readonly tips = [
    'login.tip_1',
    'login.tip_2',
    'login.tip_3',
    'login.tip_4',
    'login.tip_5',
  ];
  currentTip = signal(this.tips[0]);
  tipVisible = signal(true);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  loading = signal(false);
  error = signal('');
  submitted = signal(false);
  showPassword = signal(false);
  currentLang = signal(this.translate.currentLang ?? 'es');
  privacyOpen = signal(false);

  get emailCtrl() { return this.form.get('email'); }
  get passwordCtrl() { return this.form.get('password'); }

  ngOnInit(): void {
    document.body.style.overflow = 'hidden';

    this.slideInterval = setInterval(() => {
      this.currentSlide.update(i => (i + 1) % this.slides.length);
    }, 20000);

    this.tipInterval = setInterval(() => this.rotateTip(), 9000);
  }

  ngOnDestroy(): void {
    document.body.style.overflow = '';
    clearInterval(this.slideInterval);
    clearInterval(this.tipInterval);
  }

  private rotateTip(): void {
    this.tipVisible.set(false);
    setTimeout(() => {
      this.tipIndex = (this.tipIndex + 1) % this.tips.length;
      this.currentTip.set(this.tips[this.tipIndex]);
      this.tipVisible.set(true);
    }, 220);
  }

  togglePassword(): void {
    this.showPassword.update(v => !v);
  }

  switchLanguage(lang: string): void {
    this.translate.use(lang);
    this.currentLang.set(lang);
    localStorage.setItem('lang', lang);
  }

  async submit(): Promise<void> {
    this.submitted.set(true);
    if (this.form.invalid || this.loading()) return;

    this.loading.set(true);
    this.error.set('');

    try {
      await this.authService.login(this.form.value.email!, this.form.value.password!);
      void this.router.navigate(['/dashboard']);
    } catch {
      this.error.set(this.translate.instant('auth.login_error'));
    } finally {
      this.loading.set(false);
    }
  }
}
